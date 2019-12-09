"use strict";

var gl; 

var a_coords_loc;       // Location of the a_coords attribute variable in the shader program.
var a_normal_loc;       // Location of a_normal attribute.
var a_normal_buffer;    // Buffer for a_normal.
var a_coords_buffer;    // Buffer to hold the values for a_coords.
var color_buffer;
var index_buffer;       // Buffer to hold vetex indices from model.

var u_diffuseColor;     // Locations of uniform variables in the shader program
var u_specularColor;
var u_specularExponent;
var u_modelview;
var u_projection;
var u_normalMatrix;    

var projection = mat4.create(); 
var modelview; 
var normalMatrix = mat3.create();
var rotator;
var my_color; 

var u_sunLightPosition; 
var u_leftHeadlightPosition; 
var u_rightHeadlightPosition; 

var u_sunIsUp; 
var u_lightColoringInProgess;


var objects = [         // Objects for display
  //0       1       2           3          4             5 
    cube(), ring(), uvSphere(), uvTorus(), uvCylinder(), uvCone(), 
];


function degToRad(degrees) {
  return degrees * Math.PI / 180;
}


function print(msg){
    console.log(msg); 
}


function updateAngles(){
    if(sun_angle >= 359){
        sun_angle = 0; 
    } else{
        sun_angle += 0.5; 
    }


    if(car_angle >= 359){
        car_angle = 0; 
    } else{
        car_angle += 0.7;
    }
}


function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}


function createProgram(gl, vertexShaderID, fragmentShaderID) {
    function getTextContent( elementID ) {
        // This nested function retrieves the text content of an
        // element on the web page.  It is used here to get the shader
        // source code from the script elements that contain it.
        var element = document.getElementById(elementID);
        var node = element.firstChild;
        var str = "";
        while (node) {
            if (node.nodeType == 3) // this is a text node
                str += node.textContent;
            node = node.nextSibling;
        }
        return str;
    }
    try {
        var vertexShaderSource = getTextContent( vertexShaderID );
        var fragmentShaderSource = getTextContent( fragmentShaderID );
    }
    catch (e) {
        throw "Error: Could not get shader source code from script elements.";
    }
    var vsh = gl.createShader( gl.VERTEX_SHADER );
    gl.shaderSource(vsh,vertexShaderSource);
    gl.compileShader(vsh);
    if ( ! gl.getShaderParameter(vsh, gl.COMPILE_STATUS) ) {
        throw "Error in vertex shader:  " + gl.getShaderInfoLog(vsh);
     }
    var fsh = gl.createShader( gl.FRAGMENT_SHADER );
    gl.shaderSource(fsh, fragmentShaderSource);
    gl.compileShader(fsh);
    if ( ! gl.getShaderParameter(fsh, gl.COMPILE_STATUS) ) {
       throw "Error in fragment shader:  " + gl.getShaderInfoLog(fsh);
    }
    var prog = gl.createProgram();
    gl.attachShader(prog,vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if ( ! gl.getProgramParameter( prog, gl.LINK_STATUS) ) {
       throw "Link error in program:  " + gl.getProgramInfoLog(prog);
    }
    return prog;
}


function init() {
    try {
        var canvas = document.getElementById("myGLCanvas");
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        if ( ! gl ) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }

    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context:" + e + "</p>";
        return;
    }

    document.getElementById("animate").checked = animationOn; 
    rotator = new TrackballRotator(canvas, draw, 15);
    tick();
}


function tick(){
    requestAnimationFrame(tick); 
    draw();
}


function getColorArray(number, rgb_vals){
    var arr = []; 
    for(var i = 0; i<number/3; ++i){
        arr.push.apply(arr, rgb_vals);
    }
    return arr; 
}


function update_uniform(modelview,projection,currentModelNumber){
    /* Get the matrix for transforming normal vectors from the modelview matrix,
       and send matrices to the shader program*/
    mat3.normalFromMat4(normalMatrix, modelview);
    gl.uniformMatrix3fv(u_normalMatrix, false, normalMatrix);
    gl.uniformMatrix4fv(u_modelview, false, modelview );
    gl.uniformMatrix4fv(u_projection, false, projection );   
    gl.drawElements(gl.TRIANGLES, 
                    objects[currentModelNumber].indices.length, 
                    gl.UNSIGNED_SHORT, 0);
}


function makeRoadBase(){
    /* ############## OUTER GROUND ######################## */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    installModel(objects[objectIndex], colors.dark_green);

    mat4.translate(modelview,modelview,[0,-0.9,0]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.scale(modelview, modelview, [7,7,0.4]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;

   
    /* ############## ROAD ################################ */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 4;
    installModel(objects[objectIndex], colors.grey);

    mat4.translate(modelview,modelview,[0,-0.89,0]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.scale(modelview, modelview, [6,6,0.4]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;


    /* ############## INNER RING ########################## */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 4;
    installModel(objects[objectIndex], colors.dark_green);

    mat4.translate(modelview,modelview,[0,-0.889,0]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.scale(modelview, modelview, [3.5,3.5,0.4]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeTree(size,x,y,z){
    /* ################# TREE TOP ################# */ 
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 5;
    installModel(objects[objectIndex], colors.green);

    mat4.translate(modelview,modelview,[(0 + x) * size ,
                                        (0.6 + y) * size, 
                                        (0 + z) * size]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.rotate(modelview, modelview, degToRad(180), [0,1,0])
    mat4.scale(modelview, modelview, [size * 1,size * 1,size *1]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
    

    /* ################# TREE BASE ################# */ 
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    installModel(objects[objectIndex], colors.brown);

    mat4.translate(modelview,modelview,[x * size , y * size , z * size]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.scale(modelview, modelview, [size * 0.2, size * 0.2, size * 0.5]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makePole(lightOn){
    /* ############## POLE BASE ########################### */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    installModel(objects[objectIndex], colors.dark_grey);

    mat4.translate(modelview,modelview,[0,-0.4,0]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.scale(modelview, modelview, [0.1,0.1,1.3]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;


    
    /* ############## POLE TOP ############################ */
    gl.uniform1i(u_lightColoringInProgess, 1);     
    prevModelview = Object.assign([], modelview); 
    objectIndex = 2;

    if(lightOn == true){
        installModel(objects[objectIndex], colors.yellow);
    }else{
        installModel(objects[objectIndex], colors.dark_grey);
    }
    mat4.translate(modelview,modelview,[0,0.29,0,1]); 
    mat4.scale(modelview, modelview, [0.3,0.3,0.3]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
    gl.uniform1i(u_lightColoringInProgess, 0);     
}


function makeCarBody(angle_in_degrees){
    /* ############## CAR BOTTOM ########################## */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 0;
    installModel(objects[objectIndex], colors.red);

    var x_val = 2.3 * Math.cos(degToRad(angle_in_degrees)); 
    var z_val = 2.3 * Math.sin(degToRad(angle_in_degrees)); 
    mat4.translate(modelview,modelview,[x_val,-0.4,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.rotate(modelview, modelview, degToRad(angle_in_degrees), [0,0,1])
    mat4.scale(modelview, modelview, [0.7,1.3,0.28]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
    

    /* ############## CAR TOP ############################# */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 0;
    installModel(objects[objectIndex], colors.red);

    // var x_val = 2.3 * Math.cos(degToRad(angle_in_degrees)); 
    // var z_val = 2.3 * Math.sin(degToRad(angle_in_degrees)); 

    var x_val = 2.267 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees -3)); 
    var z_val = 2.267 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees -3)); 
    mat4.translate(modelview,modelview,[x_val,-0.27,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [1,0,0])
    mat4.rotate(modelview, modelview, degToRad(angle_in_degrees), [0,0,1])
    mat4.scale(modelview, modelview, [0.6,0.6,0.195]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeCarWheels(angle_in_degrees){
    /* ############## FRONT LEFT WHEEL ##################### */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 3;
    installModel(objects[objectIndex], colors.black);

    var x_val = 2.73 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees +10)); 
    var z_val = 2.73 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees +10)); 

    mat4.translate(modelview,modelview,[x_val ,-0.52,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.35,0.35,0.35]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
   

    /* ############# FRONT RIGHT WHEEL ##################### */
    
    prevModelview = Object.assign([], modelview); 
    objectIndex = 3;
    installModel(objects[objectIndex], colors.black);

    var x_val = 1.9 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees +14)); 
    var z_val = 1.9 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees +14)); 
    // var x_val = 1.87 * Math.cos(degToRad(angle_in_degrees)); 
    // var z_val = 1.87 * Math.sin(degToRad(angle_in_degrees)); 

    mat4.translate(modelview,modelview,[x_val ,-0.52,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.35,0.35,0.35]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;

    /* ############## BACK LEFT WHEEL ##################### */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 3;
    installModel(objects[objectIndex], colors.black);

    var x_val = 2.73 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees -10)); 
    var z_val = 2.73 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees -10)); 

    mat4.translate(modelview,modelview,[x_val ,-0.52,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.35,0.35,0.35]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;


    /* ############# BACK RIGHT WHEEL ##################### */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 3;
    installModel(objects[objectIndex], colors.black);

    var x_val = 1.9 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees -14)); 
    var z_val = 1.9 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees -14)); 

    mat4.translate(modelview,modelview,[x_val ,-0.52,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.35,0.35,0.35]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeCarHeadlights(angle_in_degrees,headlightsOn){
    /* ############# LEFT HEADLIGHT ####################### */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    if(headlightsOn ==true){
        installModel(objects[objectIndex], colors.yellow);
    }else{
        installModel(objects[objectIndex], colors.gold);
    }

    var x_val = 2.6 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees + 13.5)); 
    var z_val = 2.6 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees + 13.5)); 

    mat4.translate(modelview,modelview,[x_val,-0.4,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(180), [1,0,0])
    mat4.rotate(modelview, modelview, degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.12,0.12, 0.1]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;


    /* ############# RIGHT HEADLIGHT ####################### */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 4;

    if(headlightsOn ==true){
        installModel(objects[objectIndex], colors.yellow);
    }else{
        installModel(objects[objectIndex], colors.gold);
    }

    var x_val = 2.1 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees + 17)); 
    var z_val = 2.1 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees + 17)); 

    mat4.translate(modelview,modelview,[x_val,-0.4,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(180), [1,0,0])
    mat4.rotate(modelview, modelview, degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.12,0.12, 0.1]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeCarAxis(angle_in_degrees){
    /* ############# FRONT AXIS ############################ */
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    installModel(objects[objectIndex], colors.gold);
    var x_val = 2.31 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees + 11.6)); 
    var z_val = 2.31 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees + 11.6)); 
    mat4.translate(modelview,modelview,[x_val, -0.53 ,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.03,0.03,0.95]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;


    /* ############# REAR AXIS ############################ */
    prevModelview = Object.assign([], modelview); 
    objectIndex = 4;
    installModel(objects[objectIndex], colors.gold);

    var x_val = 2.31 / Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees - 11.6)); 
    var z_val = 2.31 / Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees - 11.6)); 
    mat4.translate(modelview,modelview,[x_val, -0.53 ,z_val]); 
    mat4.rotate(modelview, modelview, degToRad(90), [0,1,0])
    mat4.rotate(modelview, modelview, -degToRad(angle_in_degrees), [0,1,0])
    mat4.scale(modelview, modelview, [0.03,0.03,0.95]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeCarSpoke(angle_in_degrees, off_axis, distance, angle_from_center_of_car ){
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 4;
    installModel(objects[objectIndex], colors.gold);
    
    var x_val = distance/ Math.cos(degToRad(10)) * Math.cos(degToRad(angle_in_degrees + angle_from_center_of_car)); 
    var z_val = distance/ Math.cos(degToRad(10)) * Math.sin(degToRad(angle_in_degrees + angle_from_center_of_car)); 
    mat4.translate(modelview,modelview,[x_val, -0.53, z_val]); 

    // ROTATE WITH THE CAR
    mat4.rotate(modelview, modelview, degToRad(-angle_in_degrees), ([0,1,0]));
    // ROTATE THE TIRE
    mat4.rotate(modelview, modelview, degToRad(angle_in_degrees + off_axis), ([1,0,0]));

    mat4.scale(modelview, modelview, [0.01,0.01,0.3]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;
}


function makeAllCarSpokes(angle_in_degrees, 
                          innerAngle, innerDistance, 
                          outerAngle, outerDistance){

    // front left wheel spokes
    makeCarSpoke(angle_in_degrees, 0  , outerDistance,  outerAngle);
    makeCarSpoke(angle_in_degrees, 120, outerDistance,  outerAngle);
    makeCarSpoke(angle_in_degrees, 240, outerDistance,  outerAngle);

    // rear left wheel spokes
    makeCarSpoke(angle_in_degrees, 0  , outerDistance, -outerAngle);
    makeCarSpoke(angle_in_degrees, 120, outerDistance, -outerAngle);
    makeCarSpoke(angle_in_degrees, 240, outerDistance, -outerAngle);


    // front right wheel spokes
    makeCarSpoke(angle_in_degrees, 0  , innerDistance, innerAngle);
    makeCarSpoke(angle_in_degrees, 120, innerDistance, innerAngle);
    makeCarSpoke(angle_in_degrees, 240, innerDistance, innerAngle);

    // rear right wheel spokes
    makeCarSpoke(angle_in_degrees, 0  , innerDistance, -innerAngle);
    makeCarSpoke(angle_in_degrees, 120, innerDistance, -innerAngle);
    makeCarSpoke(angle_in_degrees, 240, innerDistance, -innerAngle);
}


function makeCar(angle_in_degrees, headlightsOn){
    makeCarBody(angle_in_degrees);  
    makeCarWheels(angle_in_degrees); 
    makeCarHeadlights(angle_in_degrees, headlightsOn); 
    makeCarAxis(angle_in_degrees); 

    var outerAngle = 9.7; 
    var outerDistance = 2.75; 
    var innerAngle = 14.4; 
    var innerDistance = 1.87; 

    makeAllCarSpokes(angle_in_degrees,
                     innerAngle, innerDistance, 
                     outerAngle, outerDistance); 
}


function makeTrees(){
    //       size,    x,    y,    z
    makeTree(0.8 , -0.8, -0.7,  1.5); 
    makeTree(0.5 , -0.8, -1.2, -0.1); 
    makeTree(0.8 ,  0.8, -0.7,  0.1); 
    makeTree(0.5 , -3.0, -1.2, -5.7); 
    makeTree(0.3 ,  5.0, -2.1, -9.5); 
    makeTree(0.4 ,  2.6, -1.5, -7.5); 
    makeTree(0.3 , 10.6, -2.1,  2.0); 
    makeTree(0.5 ,  6.5, -1.2,  0.0); 
    makeTree(0.4 ,  8.0, -1.5, -1.5); 
}


function makeSun(shining, angle_in_degrees){
    gl.uniform1i(u_lightColoringInProgess, 1);     
    var prevModelview = Object.assign([], modelview); 
    var objectIndex = 2;

    if(shining == true){
        installModel(objects[objectIndex], colors.yellow);
    }else{
        installModel(objects[objectIndex], colors.dark_grey);
    }

    var x_val = 4.3 * Math.cos(degToRad(angle_in_degrees)); 
    var y_val = 4.3 * Math.sin(degToRad(angle_in_degrees)); 
    mat4.translate(modelview,modelview,[x_val,y_val,0]); 
    mat4.scale(modelview, modelview, [0.6,0.6,0.6]);

    update_uniform(modelview,projection, objectIndex);
    modelview = prevModelview;

    gl.uniform1i(u_lightColoringInProgess, 0);     
}


function installModel(modelData, color_arr) {
    var color_array = getColorArray(modelData.vertexPositions.length, color_arr)

    // a verticies
    gl.bindBuffer(gl.ARRAY_BUFFER, a_coords_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexPositions, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_coords_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_coords_loc);

    // add normals
    gl.bindBuffer(gl.ARRAY_BUFFER, a_normal_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, modelData.vertexNormals, gl.STATIC_DRAW);
    gl.vertexAttribPointer(a_normal_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_normal_loc);

    // add color
    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer); 
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color_array), gl.STATIC_DRAW); 
    gl.vertexAttribPointer(my_color, 3, gl.FLOAT, false,0,0) ;
    gl.enableVertexAttribArray(my_color);

    gl.uniform4f(u_diffuseColor, color_arr[0], color_arr[1], color_arr[2], 1);

    // add indicies
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index_buffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, gl.STATIC_DRAW);
}


function initGL() {
    var prog = createProgram(gl,"vshader-source","fshader-source");
    gl.useProgram(prog);
    a_coords_loc =  gl.getAttribLocation(prog, "a_position");
    a_normal_loc =  gl.getAttribLocation(prog, "a_normal");
    my_color      =  gl.getAttribLocation(prog,"a_color"); 

    u_modelview = gl.getUniformLocation(prog, "modelview");
    u_projection = gl.getUniformLocation(prog, "projection");

    u_normalMatrix =  gl.getUniformLocation(prog, "normalMatrix");

    u_diffuseColor =  gl.getUniformLocation(prog, "diffuseColor");
    u_specularColor =  gl.getUniformLocation(prog, "specularColor");
    u_specularExponent = gl.getUniformLocation(prog, "specularExponent");

    u_sunLightPosition = gl.getUniformLocation(prog, "sunLightPosition");
    u_leftHeadlightPosition = gl.getUniformLocation(prog, "leftHeadLightPosition"); 
    u_rightHeadlightPosition = gl.getUniformLocation(prog, "rightHeadLightPosition"); 

    u_sunIsUp = gl.getUniformLocation(prog, "sunIsUp"); 
    u_lightColoringInProgess = gl.getUniformLocation(prog, "lightColoringInProgress"); 


    a_coords_buffer = gl.createBuffer();
    a_normal_buffer = gl.createBuffer();
    index_buffer = gl.createBuffer();
    color_buffer = gl.createBuffer();

    gl.enable(gl.DEPTH_TEST);
    gl.uniform3f(u_specularColor, 0.5, 0.5, 0.5);
    gl.uniform1f(u_specularExponent, 10);
    gl.uniform1i(u_lightColoringInProgess, 0);     
}


function draw(){
    gl.clearColor(0,0,0,1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    mat4.perspective(projection,Math.PI/5,1,10,20);   
    modelview = rotator.getViewMatrix();


    if(document.getElementById("animate").checked){
        updateAngles(); 
    }

    makeRoadBase();
    makeTrees();




    // left headlight
    var x_val = 4 * Math.cos(-degToRad(car_angle +30 )); 
    var z_val =  -11 - 4 * (1 + Math.sin(-degToRad(car_angle +30))); 
    gl.uniform4f(u_leftHeadlightPosition, x_val, 0,  z_val ,1); 

    // right headlight
    var x_val = 3* Math.cos(-degToRad(car_angle +30 )); 
    var z_val =  -11 - 4 * (1 + Math.sin(-degToRad(car_angle +30))); 
    gl.uniform4f(u_rightHeadlightPosition, x_val, 0, z_val ,1); 



    if(sun_angle > 180){
        // DARKNESS
        makePole(true); 
        makeSun(false, sun_angle); 
        makeCar(car_angle, true);
        gl.uniform4f(u_sunLightPosition, 0, 0,0 ,1); 
        gl.uniform1i(u_sunIsUp, 0);     

    }else{
        // LIGHT
        makePole(false); 
        makeSun(true, sun_angle); 
        makeCar(car_angle, false);

        gl.uniform1i(u_sunIsUp, 1);     

        // sun light
        var sun_dist = 4.3; 
        var x_val = sun_dist * Math.cos(degToRad(sun_angle)); 
        var y_val = sun_dist * Math.sin(degToRad(sun_angle)); 
        gl.uniform4f(u_sunLightPosition, x_val,y_val ,0 ,0); 
    }
}

var animationOn = true;
var sun_angle = 280; 
var car_angle = 60; 
var colors = {
    red: [0.4,0,0], 
    dark_red: [0.3, 0, 0], 
    yellow: [0.8,0.8,0], 
    green: [0,0.2,0], 
    dark_green: [0.0,0.15,0.0], 
    brown: [50/256,15/256,0], 
    grey: [50/256, 50/256, 50/256], 
    dark_grey: [40/256, 40/256, 40/256], 
    black: [0,0,0], 
    gold: [0.3,0.3,0.04],
    blue: [0,0,1], 
}