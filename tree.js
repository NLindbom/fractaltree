var FractalTree = (function(){

	var canvas = document.querySelector("canvas"),
		ctx = canvas.getContext("2d");

	class Point {
		constructor(x, y) {
			this.x = x;
			this.y = y;		
			if (typeof Point.radius == "undefined")
				Point.radius = 4;
		}

		inside(x, y) {
			var dx = x - this.x,
				dy = y - this.y;
			return dx * dx + dy * dy <= Point.radius * Point.radius;
		}

		draw(ctx) {
			ctx.beginPath();
			ctx.arc(this.x, this.y, Point.radius, 0, 2*Math.PI);
			ctx.fill();
		}

		static length(p1, p2) {
			var dx = p1.x - p2.x;
			var dy = p1.y - p2.y;
			return Math.sqrt(dx*dx + dy*dy);
		}
	}

	var enums = Object.freeze({ 
		drawModes : {
			smooth: 1,
			interlaced: 2
		},
		pointVisibility : {
			visible: 1,
			hidden: 2
		}
	});

	var config = (function() {
		// Default:
		var state = {
			name: "tree",
			branchWidth: 4,
			drawMode: enums.drawModes.smooth,
			points: { 
				base: new Point(400, 600),
				trunk: new Point(400, 400),
				branch1: new Point(325, 325),
				branch2: new Point(525, 325)
			},
			pointVisibility: enums.pointVisibility.visible,
		};

		var	parameters = (function() {
			var parameters = {};
			var query = window.location.search.substring(1);
			if (query == "")
				return {};
			var pairs = query.split("&");
			for (var i = 0; i < pairs.length; i++) {
				var pair = pairs[i].split("=");
				parameters[pair[0]] = pair[1];
			}
			return parameters;
		})();
		
		var setConfigProperty = function(object, property, value) {
			if (typeof value !== "undefined")
				object[property] = value;
		};

		setConfigProperty(state, "name", parameters["name"]);
		setConfigProperty(state, "branchWidth", parameters["w"]);
		setConfigProperty(state, "drawMode", enums.drawModes[parameters["mode"]]);	
		setConfigProperty(state, "pointVisibility", enums.pointVisibility[parameters["points"]]);
		setConfigProperty(state.points.base, "x", parameters["x0"]);
		setConfigProperty(state.points.base, "y", parameters["y0"]);
		setConfigProperty(state.points.trunk, "x", parameters["x1"]);
		setConfigProperty(state.points.trunk, "y", parameters["y1"]);
		setConfigProperty(state.points.branch1, "x", parameters["x2"]);
		setConfigProperty(state.points.branch1, "y", parameters["y2"]);
		setConfigProperty(state.points.branch2, "x", parameters["x3"]);
		setConfigProperty(state.points.branch2, "y", parameters["y3"]);	
		
		return state;
	})();

	var getConfigString = function() {

		// Helper for enums, given object returns propertyname with value "value"
		var getPropertyName = function(object, value) {
			for (var prop in object) {
				if (object[prop] == value)
					return prop;
			}
		};
		// Build url string
		var configString = "";
		configString += `name=${config.name}&`;
		configString += `mode=${getPropertyName(enums.drawModes, config.drawMode)}&`;
		configString += `x0=${config.points.base.x}&`;
		configString += `y0=${config.points.base.y}&`;
		configString += `x1=${config.points.trunk.x}&`;
		configString += `y1=${config.points.trunk.y}&`;
		configString += `x2=${config.points.branch1.x}&`;
		configString += `y2=${config.points.branch1.y}&`;
		configString += `x3=${config.points.branch2.x}&`;
		configString += `y3=${config.points.branch2.y}&`;
		configString += `width=${config.branchWidth}&`;
		configString += `points=${getPropertyName(enums.pointVisibility, config.pointVisibility)}`;
		
		return configString;
	};

	var points = [
		config.points.base,
		config.points.trunk,
		config.points.branch1,
		config.points.branch2
	];

	var selectedPoint = null;

	class Branch {
		constructor(x, y, ex, ey, width) {
			this.x = x;
			this.y = y;
			this.ex = ex;
			this.ey = ey;
			this.width = width;
		}
		
		drawInterlaced(parent, ctx) {
			ctx.beginPath();
			ctx.lineWidth = this.width;
			ctx.moveTo(parent.x, parent.y);
			ctx.quadraticCurveTo(this.x, this.y, this.x + this.ex, this.y + this.ey);
			ctx.stroke();
		}

		drawSmooth(parent, ctx) {
			ctx.beginPath();
			ctx.lineWidth = this.width;
			ctx.moveTo(parent.x + 0.5*parent.ex, parent.y + 0.5*parent.ey);
			ctx.quadraticCurveTo(this.x, this.y, this.x + 0.5*this.ex, this.y + 0.5*this.ey);
			ctx.stroke();
		}
	}

	class Transform {
		constructor(rads, scale){
			this.cos = Math.cos(rads) * scale;
			this.sin = Math.sin(rads) * scale;
			this.scale = scale;
		}
		
		createBranch(parent) {	
			return new Branch(
				parent.x + parent.ex,
				parent.y + parent.ey,
				parent.ex * this.cos - parent.ey * this.sin, 
				parent.ey * this.cos + parent.ex * this.sin,
				parent.width * this.scale
			);
		}
	}

	var _getAngle = function(x1, y1, x2, y2){
		return Math.atan2(y1, x1) - Math.atan2(y2, x2);	
	};

	var _getTransforms = function() {
		return [
			new Transform(
				// Angle between vectors base-trunk and trunk-branch
				_getAngle(points[2].x - points[1].x, points[2].y - points[1].y, 
					points[0].x - points[1].x, points[1].y - points[0].y),
				// Ratio between vectors base-trunk and trunk-branch
				Point.length(points[2], points[1]) / Point.length(points[1], points[0])
			), 
			new Transform(
				_getAngle(points[3].x - points[1].x, points[3].y - points[1].y, 
					points[0].x - points[1].x, points[1].y - points[0].y), 
				Point.length(points[3], points[1]) / Point.length(points[1], points[0])
			)
		];
	};

	var draw = function() {
		
		var transforms = _getTransforms();
		var branch = new Branch(points[0].x, points[0].y, points[1].x - points[0].x, points[1].y - points[0].y, config.branchWidth);

		if (canvas.getContext) {
			// Clear
			ctx.clearRect(0, 0, canvas.width, canvas.height);		
			// Draw base
			ctx.beginPath();
			ctx.moveTo(branch.x, branch.y);
			ctx.lineWidth = branch.width;
			if (config.drawMode === enums.drawModes.smooth)
				ctx.lineTo(branch.x + 0.5*branch.ex, branch.y + 0.5*branch.ey);
			else if (config.drawMode === enums.drawModes.interlaced)
				ctx.lineTo(branch.x + branch.ex, branch.y + branch.ey);
			ctx.stroke();
			// Draw branches
			if (config.drawMode === enums.drawModes.smooth)
				_drawSmooth(branch, transforms, 10);
			else if (config.drawMode === enums.drawModes.interlaced)
				_drawInterlaced(branch, transforms, 10);
			// Draw Points
			if (config.pointVisibility == enums.pointVisibility.visible) {
				for (var i = 0; i < points.length; i++) {
					points[i].draw(ctx);				
				}
			}
		}
	};

	var _drawSmooth = function(parent, transforms, depth) {
		for (var i = 0; i < transforms.length; i++) {
			var branch = transforms[i].createBranch(parent);
			branch.drawSmooth(parent, ctx);
			if (depth > 0)
				_drawSmooth(branch, transforms, depth - 1);
			delete branch;
		}	
	};

	var _drawInterlaced = function(parent, transforms, depth) {
		for (var i = 0; i < transforms.length; i++) {
			var branch = transforms[i].createBranch(parent);
			branch.drawInterlaced(parent, ctx);
			if (depth > 0)
				_drawInterlaced(branch, transforms, depth - 1);
			delete branch;
		}	
	};

	var _moveSelectedPoint  = function(x, y) {
		var dx = x - selectedPoint.x;
		var dy = y - selectedPoint.y;
		if (selectedPoint === points[0]) {
			// If base is selected, move trunk
			points[1].x = points[1].x + dx;
			points[1].y = points[1].y + dy;		
		}
		if (selectedPoint === points[0] || selectedPoint === points[1]) {
			// If base or trunk is selected, also move branches
			points[2].x = points[2].x + dx;
			points[2].y = points[2].y + dy;
			points[3].x = points[3].x + dx;
			points[3].y = points[3].y + dy;
		}
		selectedPoint.x = x;
		selectedPoint.y = y;
	};

	// Events

	canvas.addEventListener("mousedown", function(e) {
		var x = e.pageX - canvas.offsetLeft;
		var y = e.pageY - canvas.offsetTop;
		
		for (var i = 0; i < points.length; i++) {
			if (points[i].inside(x, y)) {
				selectedPoint = points[i];
			}
		}
	}, false);

	canvas.addEventListener("mouseup", function(e) {
		if (!selectedPoint)
			return;
		_moveSelectedPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);
		selectedPoint = null;
		draw();
	}, false);

	canvas.addEventListener("mousemove", function(e) {
		if (selectedPoint) {
			_moveSelectedPoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);		
			draw();
		}
	}, false);

	var _dispatchMouseEvent = function(e, type)
	{
		// dispatch touch event to mouse event
		var touch = e.touches[0];
		var mouseEvent = new MouseEvent(type, { 
			pageX: touch.pageX,
			pageY: touch.pageY
		});
		canvas.dispatchEvent(mouseEvent);
	}

	canvas.addEventListener("touchstart", function(e) { 
		_dispatchMouseEvent(e, "mousedown"); 
	}, false);

	canvas.addEventListener("touchmove", function(e) {
		_dispatchMouseEvent(e, "mousemove"); 
	}, false);

	canvas.addEventListener("touchend", function(e) { 
		_dispatchMouseEvent(e, "mouseup"); 
	}, false);

	function preventTouchScrolling(e) {
		if (e.target === canvas)
			e.preventDefault();
	}

	document.body.addEventListener("touchstart", function(e) {
		preventTouchScrolling(e);
	}, false);

	document.body.addEventListener("touchmove", function(e) {
		preventTouchScrolling(e);
	}, false);

	document.body.addEventListener("touchend", function(e) {
		preventTouchScrolling(e);
	}, false);

	draw();

	return {
		draw: draw,
		config: config,
		getConfigString: getConfigString
	};

})();