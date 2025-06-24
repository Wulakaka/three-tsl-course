import "./style.css";
import * as THREE from "three";
import img from "./frame.png";
import {EffectComposer} from "three/examples/jsm/postprocessing/EffectComposer.js";
import {RenderPass} from "three/examples/jsm/postprocessing/RenderPass.js";
import {OutlinePass} from "three/examples/jsm/postprocessing/OutlinePass.js";

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

  const pickingScene = new THREE.Scene();
  pickingScene.background = new THREE.Color(0);

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

  const loader = new THREE.TextureLoader();
  const texture = loader.load(img);

  const idToObject: {
    [id: number]: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial>;
  } = {};
  const numObjects = 100;

  for (let i = 0; i < numObjects; ++i) {
    const id = i + 1;
    const material = new THREE.MeshPhongMaterial({
      color: randomColor(),
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    idToObject[id] = cube;

    cube.position.set(rand(-20, 20), rand(-20, 20), rand(-20, 20));
    cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);
    cube.scale.set(rand(3, 6), rand(3, 6), rand(3, 6));

    const pickingMaterial = new THREE.MeshPhongMaterial({
      emissive: new THREE.Color().setHex(id, THREE.NoColorSpace),
      color: new THREE.Color(0),
      specular: new THREE.Color(0),
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
      blending: THREE.NoBlending,
    });

    const pickingCube = new THREE.Mesh(geometry, pickingMaterial);
    pickingScene.add(pickingCube);
    pickingCube.position.copy(cube.position);
    pickingCube.rotation.copy(cube.rotation);
    pickingCube.scale.copy(cube.scale);
  }

  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 5;
  outlinePass.edgeGlow = 0;
  outlinePass.edgeThickness = 2.0;
  outlinePass.visibleEdgeColor.set("#ffffff");
  outlinePass.hiddenEdgeColor.set("#ffffff");
  outlinePass.pulsePeriod = 3;
  composer.addPass(outlinePass);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    outlinePass.setSize(window.innerWidth, window.innerHeight);
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
  class GPUPickHelper {
    pickingTexture: THREE.WebGLRenderTarget;
    pixelBuffer: Uint8Array;
    pickedObject: THREE.Mesh<THREE.BoxGeometry, THREE.MeshPhongMaterial> | null;
    pickedObjectSavedColor: number;
    constructor() {
      // 创建一个1x1的渲染目标
      this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
      this.pixelBuffer = new Uint8Array(4);
      this.pickedObject = null;
      this.pickedObjectSavedColor = 0;
    }
    pick(
      cssPosition: THREE.Vector2,
      scene: THREE.Scene,
      camera: THREE.PerspectiveCamera,
      time: number
    ) {
      const {pickingTexture, pixelBuffer} = this;
      // restore the color if there is a picked object
      if (this.pickedObject) {
        this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
        this.pickedObject = null;
      }

      // 设置事业偏移来表现鼠标下的1px
      const pixelRatio = renderer.getPixelRatio();
      camera.setViewOffset(
        renderer.getContext().drawingBufferWidth, // 全宽
        renderer.getContext().drawingBufferHeight, // 全高
        (cssPosition.x * pixelRatio) | 0, // rect x
        (cssPosition.y * pixelRatio) | 0, // rect y
        1, // 宽度
        1 // 高度
      );

      // 渲染场景
      renderer.setRenderTarget(pickingTexture);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);

      // 清理场景偏移，回归正常
      camera.clearViewOffset();

      // 读取像素
      renderer.readRenderTargetPixels(
        pickingTexture,
        0, // x
        0, // y
        1, // width
        1, // height
        pixelBuffer // buffer
      );

      const id =
        (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | pixelBuffer[2];

      const intersectedObject = idToObject[id];
      outlinePass.selectedObjects = [];
      if (intersectedObject) {
        // 获取第一个对象，他是离鼠标最近的一个
        this.pickedObject = intersectedObject;
        // 保存它的颜色
        this.pickedObjectSavedColor =
          this.pickedObject.material.emissive.getHex();
        // 设置它的发光颜色为红色或黄色
        // this.pickedObject.material.emissive.setHex(
        //   (time * 8) % 2 > 1 ? 0xffff00 : 0xff0000
        // );
        outlinePass.selectedObjects = [intersectedObject];
      }
    }
  }

  const pickPosition = new THREE.Vector2();
  const pickHelper = new GPUPickHelper();
  clearPickPosition();

  function animate(time: number) {
    time *= 0.001;
    // cameraPole.rotation.y = time * 0.1;
    pickHelper.pick(pickPosition, pickingScene, camera, time);

    // just render the scene
    // renderer.render(scene, camera);
    composer.render();
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
    // pickPosition.x = (pos.x / canvas.width) * 2 - 1;
    // pickPosition.y = (pos.y / canvas.height) * -2 + 1; // note we flip Y
    pickPosition.x = pos.x;
    pickPosition.y = pos.y;
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
