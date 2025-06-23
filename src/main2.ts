import "./style.css";
import * as THREE from "three";

function main() {
  // const canvas = document.querySelector("#c");
  const renderer = new THREE.WebGLRenderer({antialias: true});
  renderer.setSize(window.innerWidth, window.innerHeight);

  document.body.appendChild(renderer.domElement);
  renderer.setAnimationLoop(animate);

  const fov = 60;
  const aspect = window.innerWidth / window.innerHeight; // the canvas default
  const near = 0.1;
  const far = 200;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 30;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("white");

  // put the camera on a pole (parent it to an object)
  // so we can spin the pole to move the camera around the scene
  const cameraPole = new THREE.Object3D();
  scene.add(cameraPole);
  cameraPole.add(camera);

  {
    const color = 0xffffff;
    const intensity = 3;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    camera.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function rand(min: number, max?: number) {
    if (max === undefined) {
      max = min;
      min = 0;
    }

    return min + (max - min) * Math.random();
  }

  function randomColor() {
    return `hsl(${rand(360) | 0}, ${rand(50, 100) | 0}%, 50%)`;
  }

  const numObjects = 100;
  for (let i = 0; i < numObjects; ++i) {
    const material = new THREE.MeshPhongMaterial({
      color: randomColor(),
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.set(rand(-20, 20), rand(-20, 20), rand(-20, 20));
    cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);
    cube.scale.set(rand(3, 6), rand(3, 6), rand(3, 6));
  }

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  class PickHelper {
    raycaster: THREE.Raycaster;
    pickedObject: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial> | null;
    pickedObjectSavedColor: number;
    constructor() {
      this.raycaster = new THREE.Raycaster();
      this.pickedObject = null;
      this.pickedObjectSavedColor = 0;
    }
    pick(
      normalizedPosition: THREE.Vector2,
      scene: THREE.Scene,
      camera: THREE.Camera,
      time: number
    ) {
      // restore the color if there is a picked object
      if (this.pickedObject) {
        this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
        this.pickedObject = null;
      }

      // cast a ray through the frustum
      this.raycaster.setFromCamera(normalizedPosition, camera);
      // get the list of objects the ray intersected
      const intersectedObjects = this.raycaster.intersectObjects(
        scene.children
      );
      if (intersectedObjects.length) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObjects[0].object as THREE.Mesh<
          THREE.BoxGeometry,
          THREE.MeshPhongMaterial
        >;

        // save its color
        this.pickedObjectSavedColor =
          this.pickedObject.material.emissive.getHex();
        // set its emissive color to flashing red/yellow
        this.pickedObject.material.emissive.setHex(
          (time * 8) % 2 > 1 ? 0xffff00 : 0xff0000
        );
      }
    }
  }

  const pickPosition = new THREE.Vector2();
  const pickHelper = new PickHelper();
  clearPickPosition();

  function animate(time: number) {
    time *= 0.001;
    cameraPole.rotation.y = time * 0.1;
    pickHelper.pick(pickPosition, scene, camera, time);

    // just render the scene
    renderer.render(scene, camera);
  }

  function getCanvasRelativePosition(event: MouseEvent | Touch) {
    const canvas = renderer.domElement;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function setPickPosition(event: MouseEvent | Touch) {
    const canvas = renderer.domElement;
    const pos = getCanvasRelativePosition(event);
    pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    pickPosition.y = (pos.y / canvas.height) * -2 + 1; // note we flip Y
  }

  function clearPickPosition() {
    // unlike the mouse which always has a position
    // if the user stops touching the screen we want
    // to stop picking. For now we just pick a value
    // unlikely to pick something
    pickPosition.x = -100000;
    pickPosition.y = -100000;
  }

  window.addEventListener("mousemove", setPickPosition);
  window.addEventListener("mouseout", clearPickPosition);
  window.addEventListener("mouseleave", clearPickPosition);

  window.addEventListener(
    "touchstart",
    (event) => {
      // prevent the window from scrolling
      event.preventDefault();
      setPickPosition(event.touches[0]);
    },
    {passive: false}
  );

  window.addEventListener("touchmove", (event) => {
    setPickPosition(event.touches[0]);
  });

  window.addEventListener("touchend", clearPickPosition);
}

main();
