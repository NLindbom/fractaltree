var canvas = document.querySelector('canvas'),
	ctx = canvas.getContext('2d');

var	transforms,
	drawing = false;

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

var basePoint = new Point(400, 600, 4),
	trunkPoint = new Point(400, 400, 4),
	branchPoint1 = new Point(325, 325, 4),
	branchPoint2 = new Point(525, 325, 4);

var selectedPoint;

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

function movePoint(x, y){
	if (selectedPoint === trunkPoint){
		var dx = selectedPoint.x - x;
		var dy = selectedPoint.y - y;
		branchPoint1.moveTo(branchPoint1.x + dx, branchPoint1.y + dy);
		branchPoint2.moveTo(branchPoint2.x + dx, branchPoint2.y + dy);
	}
	selectedPoint.moveTo(x, y);	
}

canvas.addEventListener("mousedown", function (e){
	var x = e.pageX - canvas.offsetLeft;
	var y = e.pageY - canvas.offsetTop;
	
	if (trunkPoint.inside(x, y)){
		selectedPoint = trunkPoint;
	}
	else if (branchPoint1.inside(x, y)){
		selectedPoint = branchPoint1;
	}
	else if (branchPoint2.inside(x, y)){
		selectedPoint = branchPoint2;
	}
}, false);

canvas.addEventListener("mouseup", function (e){
	if (!selectedPoint)
		return;
	movePoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);
	selectedPoint = null;
	draw();
}, false);

canvas.addEventListener("mousemove", function (e){	
	if (selectedPoint) {
		movePoint(e.pageX - canvas.offsetLeft, e.pageY - canvas.offsetTop);		
		draw();
	}
}, false);

function dispatchMouseEvent(e, type)
{
	// dispatch touch event to mouse event
	var touch = e.touches[0];
	var mouseEvent = new MouseEvent(type, { 
		pageX: touch.pageX,
		pageY: touch.pageY
	});
	canvas.dispatchEvent(mouseEvent);
}

canvas.addEventListener("touchstart", function (e){ 
	dispatchMouseEvent(e, "mousedown"); 
}, false);

canvas.addEventListener("touchmove", function (e){ 
	dispatchMouseEvent(e, "mousemove"); 
}, false);

canvas.addEventListener("touchend", function (e) { 
	dispatchMouseEvent(e, "mouseup"); 
}, false);

function preventTouchScrolling(e) {
	if (e.target == canvas)
		e.preventDefault();
}

document.body.addEventListener("touchstart", function (e) {
	preventTouchScrolling(e);
}, false);

document.body.addEventListener("touchmove", function (e) {
	preventTouchScrolling(e);
}, false);

document.body.addEventListener("touchend", function (e) {
	preventTouchScrolling(e);
}, false);