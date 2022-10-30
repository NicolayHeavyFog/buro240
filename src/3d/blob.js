export default function useGlobalBlob(colorBlobs, container) {
  var canvas = document.createElement("canvas");
  var width = (canvas.width = window.innerWidth * 0.75);
  var height = (canvas.height = window.innerHeight * 0.75);
  const section = container.classList.value.split("__")[0];
  canvas.classList.add(`${section}__background-canvas`);
  container.append(canvas);

  var gl = canvas.getContext("webgl");

  // gl.clearColor(0.5, 0, 0, 0.5);
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // console.log(canvas.c);
  // gl.fillStyle = "rgba(255, 255, 255, 0.5)";
  // gl.globalCompositeOperation = "lighter";
  // gl.globalAlpha = 0.5;

  // var mouse = { x: 0, y: 0 };

  var numMetaballs = 14;
  var metaballs = [];

  for (var i = 0; i < numMetaballs; i++) {
    var radius = Math.random() * 60 + 40;
    metaballs.push({
      x: Math.random() * (width - 2 * radius) + radius,
      y: Math.random() * (height - 2 * radius) + radius,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      r: radius * 0.75,
    });
  }

  var vertexShaderSrc = `
attribute vec2 position;

void main() {
// position specifies only x and y.
// We set z to be 0.0, and w to be 1.0
gl_Position = vec4(position, 0.0, 1.0);
}
`;

  var fragmentShaderSrc =
    `
precision highp float;

const float WIDTH = ` +
    (width >> 0) +
    `.0;
const float HEIGHT = ` +
    (height >> 0) +
    `.0;

uniform vec3 metaballs[` +
    numMetaballs +
    `];

void main(){
float x = gl_FragCoord.x;
float y = gl_FragCoord.y;

float sum = 0.0;
for (int i = 0; i < ` +
    numMetaballs +
    `; i++) {
vec3 metaball = metaballs[i];
float dx = metaball.x - x;
float dy = metaball.y - y;
float radius = metaball.z;

sum += (radius * radius) / (dx * dx + dy * dy);
}
if (sum >= 0.99) {
gl_FragColor = ${colorBlobs};
return;
}

gl_FragColor = vec4(1.0, 1.0, 1.0, 0);
}
`;
  //

  // mix(
  //   vec3(0.87, 0.87, 0.87),
  //   vec3(0.85, 0.90, 0.91),
  //   max(0.10, 1.0 - (sum - 0.99) * 100.0)
  //   ), 1.0);
  //  vec4(
  //        mix(
  //            vec3(0.87, 0.87, 0.87),
  //            vec3(0.85, 0.90, 0.91))
  //            max(0.0, 1.0 - (sum - 0.99) * 100.0)), 1.0);
  // );
  //
  //

  // gl_FragColor = vec4(
  //                      mix(
  //                          vec3(x / WIDTH, y / HEIGHT, 1.0),
  //                          vec3(0, 0, 0),
  //                          max(0.0, 1.0 - (sum - 0.99) * 100.0)), 1.0);

  var vertexShader = compileShader(vertexShaderSrc, gl.VERTEX_SHADER);
  var fragmentShader = compileShader(fragmentShaderSrc, gl.FRAGMENT_SHADER);
  var program = createProgram(gl, vertexShader, fragmentShader);

  function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }

    return program;
  }

  var positionHandle = getAttribLocation(program, "position");
  var vertexDataBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexDataBuffer);
  var vertexData = new Float32Array([
    -1.0,
    1.0, // top left
    -1.0,
    -1.0, // bottom left
    1.0,
    1.0, // top right
    1.0,
    -1.0, // bottom right
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

  gl.enableVertexAttribArray(positionHandle);
  gl.vertexAttribPointer(
    positionHandle,
    2, // position is a vec2
    gl.FLOAT, // each component is a float
    gl.FALSE, // don't normalize values
    2 * 4, // two 4 byte float components per vertex
    0 // offset into each span of vertex data
  );

  var metaballsHandle = getUniformLocation(program, "metaballs");

  loop();
  function loop() {
    for (var i = 0; i < numMetaballs; i++) {
      var metaball = metaballs[i];
      metaball.x += metaball.vx / 2.5;
      metaball.y += metaball.vy / 2.5;

      if (metaball.x < metaball.r || metaball.x > width - metaball.r)
        metaball.vx *= -1;
      if (metaball.y < metaball.r || metaball.y > height - metaball.r)
        metaball.vy *= -1;
    }

    var dataToSendToGPU = new Float32Array(3 * numMetaballs);
    for (var l = 0; l < numMetaballs; l++) {
      var baseIndex = 3 * l;
      var mb = metaballs[l];
      dataToSendToGPU[baseIndex + 0] = mb.x;
      dataToSendToGPU[baseIndex + 1] = mb.y;
      dataToSendToGPU[baseIndex + 2] = mb.r;
    }
    gl.uniform3fv(metaballsHandle, dataToSendToGPU);

    //Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    requestAnimationFrame(loop);
  }

  function compileShader(shaderSource, shaderType) {
    var shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw "Shader compile failed with: " + gl.getShaderInfoLog(shader);
    }

    return shader;
  }

  function getUniformLocation(program, name) {
    var uniformLocation = gl.getUniformLocation(program, name);
    if (uniformLocation === -1) {
      throw "Can not find uniform " + name + ".";
    }
    return uniformLocation;
  }

  function getAttribLocation(program, name) {
    var attributeLocation = gl.getAttribLocation(program, name);
    if (attributeLocation === -1) {
      throw "Can not find attribute " + name + ".";
    }
    return attributeLocation;
  }
  // gl.clearColor(1, 0, 0, 0.5);
  // gl.clearColor(255, 255, 255, 0.5);/
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // canvas.onmousemove = function (e) {
  //   mouse.x = e.clientX;
  //   mouse.y = e.clientY;
  // };
}