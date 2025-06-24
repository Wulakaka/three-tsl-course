import "./style.css";
import * as THREE from "three/webgpu";
import {
  abs,
  clamp,
  cos,
  dot,
  Fn,
  length,
  max,
  mix,
  mod,
  negate,
  oneMinus,
  positionLocal,
  sin,
  smoothstep,
  step,
  time,
  vec2,
  vec3,
} from "three/tsl";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10
);
camera.position.z = 1;

const renderer = new THREE.WebGPURenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setAnimationLoop(animate);

window.addEventListener("resize", function () {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

//@ts-ignore
const Line = Fn(([position, direction, distance, thickness]) => {
  // 目标是让线的所在范围变成 0 后，再翻转

  const projection = dot(position, direction); // scalar projection

  // const line = projection;
  // const line = position.sub(projection);
  // const line = position.sub(projection.mul(direction));
  // const line = length(position.sub(projection.mul(direction)));
  //const line = step(thickness, length(position.sub(projection.mul(direction)))).oneMinus()
  // const line = smoothstep(
  //   thickness,
  //   0.0,
  //   length(position.sub(projection.mul(direction)))
  // );

  const clampedProjection = clamp(projection, 0.0, distance);
  const line = smoothstep(
    thickness,
    0.0,
    length(position.sub(clampedProjection.mul(direction)))
  );
  return line;
});

//@ts-ignore
const Circle = Fn(([position, radius, thickness]) => {
  // const distance = position;
  // const distance = length(position);
  // sub 用于将边缘的值变成 0
  const distance = length(position).sub(radius);
  // return distance;
  // return abs(distance);
  // return step(thickness, abs(distance)).oneMinus();
  return smoothstep(thickness, 0, abs(distance));
});

const main = Fn(() => {
  const p = positionLocal.toVar();
  // 放大2倍
  p.mulAssign(2);

  const radius = 0.5;
  const thickness = 0.01;

  // const circle = Circle(p, radius, thickness);

  const circleOffset = vec2(-0.66, 0.66);
  const circle = Circle(p.sub(circleOffset), radius, thickness);

  const angle = time;
  const direction = vec2(cos(angle), sin(angle));
  const radiusLine = Line(p.sub(circleOffset), direction, radius, thickness);

  // return max(circle, radiusLine);

  const finalColor = mix(circle, vec3(1, 0, 0), radiusLine);
  return finalColor;
});

const material = new THREE.NodeMaterial();
material.fragmentNode = main();

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(mesh);

// renderer.debug.getShaderAsync(scene, camera, mesh).then((e) => {
//   //console.log(e.vertexShader)
//   console.log(e.fragmentShader)
// })

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
