## What Do We Have

THREE.NodeMaterial 是 three/webgpu 库中的材质。

fragmentNode 是 NodeMaterial 的属性，
属性值可以是颜色，也可以是纹理。

纹理需要调整 color space。

```js
material.fragmentNode = convertColorSpace(
  texture(new THREE.TextureLoader().load(gridImg)),
  THREE.SRGBColorSpace,
  THREE.LinearSRGBColorSpace
);
```

positionLocal 可以访问片元着色器的位置坐标。
