import "./style.css";
import * as THREE from "three/webgpu";
import {positionLocal, Fn, If, abs, rotateUV, time, vec2} from "three/tsl";
import {OrbitControls} from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  53,
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

const material = new THREE.NodeMaterial();
// material.fragmentNode = color('crimson')
// material.fragmentNode = convertColorSpace(
//   texture(new THREE.TextureLoader().load('https://sbcode.net/img/grid.png')),
//   THREE.SRGBColorSpace,
//   THREE.LinearSRGBColorSpace
// )

const main = Fn(() => {
  const p = positionLocal.toVar();

  p.assign(rotateUV(p.xy, time, vec2()));

  If(abs(p.x).lessThan(0.01), () => {
    // @ts-ignore
    p.z = 1;
  });

  If(abs(p.y).lessThan(0.01), () => {
    // @ts-ignore
    p.z = 1;
  });

  return p;
});

material.fragmentNode = main();

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(), material);
scene.add(mesh);

renderer.debug.getShaderAsync(scene, camera, mesh).then((e) => {
  //console.log(e.vertexShader)
  console.log(e.fragmentShader);
});

// scene.background = main();

function animate() {
  controls.update();

  renderer.render(scene, camera);
}
