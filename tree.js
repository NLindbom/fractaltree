class Transform{
	constructor(rads, scale){
		this.cos = Math.cos(rads) * scale;
		this.sin = Math.sin(rads) * scale;
		this.scale = scale;
	}
	
	createBranch(parent_branch)
	{	
		return new Branch(
			parent_branch.x + parent_branch.ex,
			parent_branch.y + parent_branch.ey,
			parent_branch.ex * this.cos - parent_branch.ey * this.sin, 
			parent_branch.ey * this.cos + parent_branch.ex * this.sin,
			parent_branch.width * this.scale);
	}
}

class Point{
	constructor(x, y, radius){
		this.x = x;
		this.y = y;
		this.r = radius;
	}

	inside(x, y){
		var dx = x - this.x,
			dy = y - this.y;

		return dx * dx + dy * dy <= this.r * this.r;
	}

	draw(){
		ctx.beginPath();
		ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
		ctx.fill();
	}

	moveTo(x, y){
		this.x = x;
		this.y = y;
	}

	static length(p1, p2){
		var dx = p1.x - p2.x;
		var dy = p1.y - p2.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
}

class Branch{
	constructor(x, y, ex, ey, width){
		this.x = x;
		this.y = y;
		this.ex = ex;
		this.ey = ey;
		this.width = width;
	}
	
	draw(){
		ctx.beginPath();
		ctx.moveTo(this.x + this.ex, this.y + this.ey);
		ctx.lineWidth = this.width;
		ctx.lineTo(this.x, this.y);
		ctx.stroke();
	}	

	draw_nested(parent_branch){
		ctx.beginPath();
		ctx.lineWidth = this.width;
		ctx.moveTo(parent_branch.x, parent_branch.y);
		ctx.quadraticCurveTo(this.x, this.y, this.x + this.ex, this.y + this.ey);
		ctx.stroke();
	}

	draw_smooth(parent_branch){
		ctx.beginPath();
		ctx.lineWidth = this.width;
		ctx.moveTo(parent_branch.x + 0.5*parent_branch.ex, parent_branch.y + 0.5*parent_branch.ey);
		ctx.quadraticCurveTo(this.x, this.y, this.x + 0.5*this.ex, this.y + 0.5*this.ey);
		ctx.stroke();
	}
}

var canvas = document.querySelector('canvas'),
	ctx = canvas.getContext('2d');

var	transforms,
	drawing = false;

var basePoint = new Point(400, 600, 4),
	trunkPoint = new Point(400, 400, 4),
	branchPoint1 = new Point(325, 325, 4),
	branchPoint2 = new Point(525, 325, 4);

function angle(x, y, x2, y2){
	return Math.atan2(y, x) - Math.atan2(y2, x2);	
}

function getTransforms() {
	return [
		new Transform(
			angle(branchPoint1.x - trunkPoint.x, branchPoint1.y - trunkPoint.y, basePoint.x - trunkPoint.x, trunkPoint.y - basePoint.y), 
			Point.length(branchPoint1, trunkPoint) / Point.length(trunkPoint, basePoint)), 
		new Transform(
			angle(branchPoint2.x - trunkPoint.x, branchPoint2.y - trunkPoint.y, basePoint.x - trunkPoint.x, trunkPoint.y - basePoint.y), 
			Point.length(branchPoint2, trunkPoint) / Point.length(trunkPoint, basePoint)),
	];
}

function draw(){

	if (drawing)
		return;

	drawing = true;

	transforms = getTransforms();

	var trunk = new Branch(basePoint.x, basePoint.y, trunkPoint.x - basePoint.x, trunkPoint.y - basePoint.y, 4);

	if (canvas.getContext){
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		trunkPoint.draw();
		branchPoint1.draw();
		branchPoint2.draw();
		
		trunk.draw();

		draw_branches(trunk, 10);
	}

	drawing = false;
}

function draw_branches(parent_branch, depth)
{
	for (var i = 0; i < transforms.length; i++){
		var branch = transforms[i].createBranch(parent_branch);
		branch.draw_smooth(parent_branch);			
		if (depth > 0)
			draw_branches(branch, depth - 1);
		delete branch;
	}	
}

draw();

var mouseDownPoint;

function onMouseDown(e){
	var mouseDownX = e.pageX - canvas.offsetLeft;
	var mouseDownY = e.pageY - canvas.offsetTop;
	
	if (trunkPoint.inside(mouseDownX, mouseDownY)){
		mouseDownPoint = trunkPoint;
	}
	else if (branchPoint1.inside(mouseDownX, mouseDownY)){
		mouseDownPoint = branchPoint1;
	}
	else if (branchPoint2.inside(mouseDownX, mouseDownY)){
		mouseDownPoint = branchPoint2;
	}
}

function onMouseUp(e){
	if (!mouseDownPoint)
		return;

	var mouseUpX = e.pageX - canvas.offsetLeft;
	var mouseUpY = e.pageY - canvas.offsetTop;

	if (mouseDownPoint === trunkPoint){
		var dx = mouseDownPoint.x - mouseUpX;
		var dy = mouseDownPoint.y - mouseUpY;
		branchPoint1.moveTo(branchPoint1.x + dx, branchPoint1.y + dy);
		branchPoint2.moveTo(branchPoint2.x + dx, branchPoint2.y + dy);
	}

	mouseDownPoint.moveTo(mouseUpX, mouseUpY);	
	mouseDownPoint = null;

	draw();
}

function onMouseMove(e){
	
	if (mouseDownPoint)
	{
		var mouseX = e.pageX - canvas.offsetLeft;
		var mouseY = e.pageY - canvas.offsetTop;
	
		if (mouseDownPoint === trunkPoint){
			var dx = mouseDownPoint.x - mouseX;
			var dy = mouseDownPoint.y - mouseY;
			branchPoint1.moveTo(branchPoint1.x + dx, branchPoint1.y + dy);
			branchPoint2.moveTo(branchPoint2.x + dx, branchPoint2.y + dy);
		}
	
		mouseDownPoint.moveTo(mouseX, mouseY);	
		
		draw();
	}
}

canvas.onmousedown = onMouseDown;
canvas.onmouseup = onMouseUp;
canvas.onmousemove = onMouseMove;
