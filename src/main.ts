import "./style.css";
import * as THREE from "three/webgpu";
import {color, convertColorSpace, positionLocal, texture} from "three/tsl";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";
import gridImg from "./grid.png";

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

const material = new THREE.NodeMaterial(); // comes from three/webgpu
// material.fragmentNode = color("crimson"); // color comes from three/tsl
// 调整 color space，让颜色正确显示
// material.fragmentNode = convertColorSpace(
//   texture(new THREE.TextureLoader().load(gridImg)),
//   THREE.SRGBColorSpace,
//   THREE.LinearSRGBColorSpace
// );
material.fragmentNode = positionLocal;

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
scene.add(mesh);

renderer.debug.getShaderAsync(scene, camera, mesh).then((e) => {
  console.log(e.fragmentShader);
});

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
