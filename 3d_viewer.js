<script>
    document.addEventListener('DOMContentLoaded', () => {

    let userID = "";
    (async () => {
        try {
        const { data: member } = await window.$memberstackDom.getCurrentMember();
        if (member) {
            userID = member.id;
            console.log("User ID:", userID);
            await fetchDynamoData(true, '');
        } else {
            console.log("No member logged in.");
        }
        } catch (error) {
        console.error("Error fetching MemberStack user data:", error);
        }
    })();

    let scene, camera, renderer, objLoader, mtlLoader, gltfLoader, controls, currentModel, mixer, exploded = false, isGLTF=false;
    let distanceValue = 0;
    let previousDistanceValue = 0;
    const wasmUrl = 'https://cdn.jsdelivr.net/npm/occt-import-js@0.0.12/dist/occt-import-js.wasm';

    const viewerElement = document.getElementById('3d-viewer');
    const resizable = document.querySelector('.resizable');
    const selectBox = document.querySelector('#objects');
    const animationSelect = document.getElementById('animations');
    const models = document.querySelectorAll('.model');
    const autoRotateCheckbox = document.getElementById('auto-rotate');
    const cotationCheckbox = document.getElementById('cotationCheckbox');
    const blackModeCheckbox = document.getElementById('blackMode');
    const repereCheckbox = document.getElementById('repereCheckbox');
    const loadingContainer = document.querySelector('.loading-container');
    const deleteItem = document.querySelector('.loading-container');
    const progressCircle = loadingContainer.querySelector('circle:nth-of-type(2)');
    const percentageText = loadingContainer.querySelector('.percentage');
    const params = new URLSearchParams(window.location.search);
    const selectedItem = params.get('model');
    const textureLoader = new THREE.TextureLoader();
    const PBR_MAPS = {
        map: ["albedo", "basecolor", "base_color", "diffuse", "color"],                
        metalnessMap: ["metalness", "metallic"],                                      
        roughnessMap: ["roughness", "rough"],
        specularMap: ["specular", "spec"],
        normalMap: ["normal", "normalmap", "normals"],
        aoMap: ["ambientocclusion", "ao", "occlusion"],
        displacementMap: ["height", "displacement", "disp", "bump"],
        emissiveMap: ["emissive", "emission", "selfillumination", "self_illumination"],
        alphaMap: ["opacity", "alpha", "transparency"],
        glossinessMap: ["glossiness", "gloss"],
        clearcoatMap: ["clearcoat", "clear_coat"],
        clearcoatRoughnessMap: ["clearcoat_roughness", "clearcoatroughness"],
        sheenColorMap: ["sheen"],
        anisotropyMap: ["anisotropy", "anisotropic", "anisotropydirection", "anisotropic_direction"]
    };

    const loaders = {
        fbx: new THREE.FBXLoader(),
        obj: new THREE.OBJLoader(),
        stl: new THREE.STLLoader(),
        ply: new THREE.PLYLoader(),
        gltf: new THREE.GLTFLoader(),
        glb: new THREE.GLTFLoader(),
        };

    let rotationSpeed = 0;
    let explosionDist = 0; 
    let isResizing = false;
    let currentHandle = null;
    let targetSpeed = 20;
    let easingFactor = 0.05;
    let isEasing = false;
    let isRotating = true;
    let textMeshes = [];
    let occtInitialized = false;
    let occt;
    let progress = 0;
    let breakpoints = 0;
    const distanceScaleFactor = 3;
    const smoothFactor = 0.05;

    window.addEventListener('resize', onResize);

    const targetPosition = new THREE.Vector3();

    const textureMap = new Map();
    const texturePaths = {
        albedo: null,
        normal: null,
        roughness: null,
        metalness: null,
        ao: null,
        height: null,
        emissive: null,
        alpha: null
        };
    
        function populateselectBox(folders) {
        
        folders.forEach((folder) => {
            const option = document.createElement("option");
            option.value = folder;
            option.textContent = folder;
            selectBox.appendChild(option);
        });
        }
    
    async function fetchDynamoData(init, selectedItem) {
        console.log("Initializing selectBox...");
        console.log(userID);
    
        const lambdaUrl = "https://2uhjohkckl.execute-api.eu-west-3.amazonaws.com/production/fetchDynamoDB";
    
        try {
            const response = await fetch(lambdaUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userID: userID, selectedItem: selectedItem }),
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
    
            const data = await response.json();
            console.log("Data received from Lambda:", data);
    
            const items = JSON.parse(data.body);
    
            if (init) {
                console.log('huihui');
                items.forEach(item => {
                    console.log(item);
                    const option = document.createElement('option');
                    option.value = item.objectName;
                    option.textContent = item.objectName;
                    selectBox.appendChild(option);
                });
            } else {
                console.log('shololo');
                console.log(items);
                return items;
            }
        } catch (error) {
            console.error("Error calling Lambda function:", error);
            throw error;
        }
    }
        
    function init3DViewer() {

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(50, resizable.clientWidth / resizable.clientHeight, 100, 50000);
        camera.position.set(0, 0, 15);
        camera.near = 0.1;
        camera.far = 10000;
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        camera.updateProjectionMatrix();
        scene.add(camera);

        renderer = new THREE.WebGLRenderer({antialias: true });
        renderer.setSize(resizable.clientWidth, resizable.clientHeight);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setPixelRatio(window.devicePixelRatio);
        viewerElement.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls( camera, renderer.domElement );
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false;

        models.forEach((el) => {
        let option = document.createElement('option');
        const objectLink = el.getAttribute('data-link');
        const mtlLink = el.getAttribute('data-mtl');
        const animationLink = el.getAttribute('data-animation_url');
        const textureLink = el.getAttribute('data-textures');

        if (objectLink) {
            option.text = el.innerText.trim();
            option.value = objectLink;
            option.setAttribute('data-mtl', mtlLink);
            option.setAttribute('data-animation_url', animationLink);
            option.setAttribute('data-textures', textureLink);
            selectBox.add(option);
            }
        });
        
        const nullObject = new THREE.Object3D();
        nullObject.position.set(0, 0, 0);
        nullObject.name = "nullObject";
        scene.add(nullObject);

        const planeGeometry = new THREE.PlaneGeometry(10000, 10000);
        const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.5 });
        const plane = new THREE.Mesh(planeGeometry, shadowMaterial);
        plane.receiveShadow = true;
        plane.name = 'planeBG';
        camera.add(plane);

        const maskGeometry = new THREE.PlaneGeometry(2, 2);
        const maskMaterial = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(resizable.clientWidth, resizable.clientHeight) },
                radiusX: { value: 0.45 },
                radiusY: { value: 0.45 },
                edgeFade: { value: 0.1 },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec2 resolution;
                uniform float radiusX; // Horizontal radius
                uniform float radiusY; // Vertical radius
                uniform float edgeFade;
                varying vec2 vUv;

                void main() {
                    // Normalize coordinates to fit the canvas
                    vec2 uv = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0); // Maintain aspect ratio
                    //vec2 uv = (vUv - 0.5) * vec2(1.0, 1.0);
                    // Adjusted distance calculation for the oval shape
                    float dist = length(vec2(uv.x / radiusX, uv.y / radiusY)); // Scale by radii

                    // Calculate fade region using smoothstep for soft edges
                    float oval = smoothstep(1.0 - edgeFade, 1.0 + edgeFade, dist);

                    // Inside the oval is visible (transparent), outside is black with smooth fade
                    gl_FragColor = vec4(0.0, 0.0, 0.0, oval);
                }
            `,
            transparent: true,
        });

        const maskQuad = new THREE.Mesh(maskGeometry, maskMaterial);
        maskQuad.name = "maskQuad";
        maskQuad.visible = true;
        scene.add(maskQuad);

        const maskGeometrySquare = new THREE.PlaneGeometry(2, 2);
        const maskMaterialSquare = new THREE.ShaderMaterial({
            uniforms: {
                resolution: { value: new THREE.Vector2(resizable.clientWidth, resizable.clientHeight) },
                squareSize: { value: 0.99 },
                borderThickness: { value: 0.01 },
                borderColor: { value: new THREE.Color(1.0, 0.0, 0.0) }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec2 resolution;
                uniform float squareSize;
                uniform float borderThickness;
                uniform vec3 borderColor;
                varying vec2 vUv;

                void main() {
                    // Normalize coordinates to fit the canvas
                    vec2 uv = (vUv - 0.5) * vec2(resolution.x / resolution.y, 1.0); // Maintain aspect ratio

                    // Calculate square bounds
                    float halfSize = squareSize / 2.0;  // Half the size of the square
                    float halfThickness = borderThickness / 2.0; // Half thickness for the border

                    // Check if the current pixel is within the border area
                    bool insideBorder = (
                        (uv.x > -halfSize - halfThickness && uv.x < -halfSize + halfThickness && uv.y > -halfSize && uv.y < halfSize) || // Left border
                        (uv.x > halfSize - halfThickness && uv.x < halfSize + halfThickness && uv.y > -halfSize && uv.y < halfSize) || // Right border
                        (uv.y > -halfSize - halfThickness && uv.y < -halfSize + halfThickness && uv.x > -halfSize && uv.x < halfSize) || // Bottom border
                        (uv.y > halfSize - halfThickness && uv.y < halfSize + halfThickness && uv.x > -halfSize && uv.x < halfSize)    // Top border
                    );

                    if (insideBorder) {
                        // Inside the border area: color it with the border color
                        gl_FragColor = vec4(borderColor, 1.0); // Opaque border color
                    } else {
                        // Outside the square and border: fully transparent
                        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
                    }
                }
            `,
            transparent: true,
        });

        const maskQuadSquare = new THREE.Mesh(maskGeometrySquare, maskMaterialSquare);
        maskQuadSquare.name = "maskQuadSquare";
        maskQuadSquare.visible = false;
        scene.add(maskQuadSquare);

        setInterval(startExplosionAndAdjustCamera, 100);
        easeInRotation();
        animate();
        onResize();
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        scene.add(ambientLight);
        controls.addEventListener("change", updatePlanePosition);

    }

    function onResize() {
        const width = resizable.clientWidth;
        const height = resizable.clientHeight;
        renderer.setSize(width, height);
        scene.getObjectByName('maskQuad').material.uniforms.resolution.value.set(width, height);
        scene.getObjectByName('maskQuadSquare').material.uniforms.resolution.value.set(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    class ModelWrapper {
        constructor(model, isGLTF=false) {
        if (isGLTF) {
            this.model = model.scene;
        }
        else {
            this.model = model;
        }
        console.log(this.model.type);
        this.updatedBoundingBox = new THREE.Box3();
        this.center = new THREE.Vector3(0, 0, 0);
        this.pieceCenters = [];
        this.directionVectors = [];
        this.originalPositions = [];
        this.maxDistance = 0;
        this.model.castShadow = true;
        this.model.receiveShadow = true;

        if (this.model.rotation.x === -Math.PI / 2) {
            this.pointingAxis = 'z';
            console.log("The model was likely Z-up and was rotated to fit Y-up.");
        } else if (this.model.rotation.x === 0) {
            this.pointingAxis = 'y';
            console.log("The model is Y-up by default.");
        }

        this.boundingBox = new THREE.Box3().setFromObject(this.model, true);
        this.centerBbox = this.boundingBox.getCenter(new THREE.Vector3());
        this.size = this.boundingBox.getSize(new THREE.Vector3());
        this.model.position.sub(this.centerBbox);

        this.createBoundingBoxMesh();
        this.computeChildrenBoundingBox();
        this.createBoundingBoxesAndAnnotations();
        this.adjustCameraClippingAndPlaneSize();
        }

        updateCameraClippingPlanes() {
        const maxDimension = Math.max(this.size.x, this.size.y, this.size.z);
        camera.near = maxDimension * 0.01;
        camera.far = maxDimension * 100;
        camera.updateProjectionMatrix();
        }

        adjustCameraClippingAndPlaneSize() {
        const maxDimension = Math.max(this.size.x, this.size.y, this.size.z);
        camera.near = maxDimension * 0.01;
        camera.far = maxDimension * 1000;
        const planeBG = camera.getObjectByName('planeBG');
        }

        createBoundingBoxMesh() {
        const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
        const boxMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const boundingBoxHelper = new THREE.LineSegments(
            new THREE.EdgesGeometry(boxGeometry),
            boxMaterial
        );

        boundingBoxHelper.name = 'boundingBoxHelper';
        boundingBoxHelper.scale.set(this.size.x, this.size.y, this.size.z);
        if (cotationCheckbox.checked) {
            boundingBoxHelper.visible = true;
        } else {
            boundingBoxHelper.visible = false;
        }
        boundingBoxHelper.userData.isAnnotation = true;
        this.model.add(boundingBoxHelper);
        boundingBoxHelper.position.set(this.centerBbox.x, this.centerBbox.y, this.centerBbox.z);
        }


        
        createBoundingBoxesAndAnnotations() {

        const objectHeight = getObjectHeight(this.model);
        this.createDoubleSidedArrow(
            new THREE.Vector3(this.boundingBox.min.x, this.boundingBox.min.y, this.boundingBox.min.z),
            new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.min.z),
            `${this.size.x.toFixed(2)} cm`,
            objectHeight
        );

        this.createDoubleSidedArrow(
            new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.min.z),
            new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.max.y, this.boundingBox.min.z),
            `${this.size.y.toFixed(2)} cm`,
            objectHeight
        );

        this.createDoubleSidedArrow(
            new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.min.z),
            new THREE.Vector3(this.boundingBox.max.x, this.boundingBox.min.y, this.boundingBox.max.z),
            `${this.size.z.toFixed(2)} cm`,
            objectHeight
        );
        }

        createDoubleSidedArrow(startPoint, endPoint, label, objectHeight, color = 0x37b6ff, textSizePercent = 0.05) {

        const direction = new THREE.Vector3().subVectors(endPoint, startPoint).normalize();
        const reverseDirection = new THREE.Vector3().subVectors(startPoint, endPoint).normalize();
        const arrowLength = startPoint.distanceTo(endPoint);
        const arrowHelper1 = new THREE.ArrowHelper(direction, startPoint, arrowLength, color);
        arrowHelper1.userData.isAnnotation = true;
        if (cotationCheckbox.checked) {
            arrowHelper1.visible = true;
        } else {
            arrowHelper1.visible = false;
        }
        this.model.add(arrowHelper1);

        const arrowHelper2 = new THREE.ArrowHelper(reverseDirection, endPoint, arrowLength, color);
        arrowHelper2.userData.isAnnotation = true;
        if (cotationCheckbox.checked) {
            arrowHelper2.visible = true;
        } else {
            arrowHelper2.visible = false;
        }
        this.model.add(arrowHelper2);

        const loader = new THREE.FontLoader();
        loader.load(
            'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/fonts/helvetiker_regular.typeface.json',
            function (font) {
                const textSize = objectHeight * textSizePercent;
                const textGeometry = new THREE.TextGeometry(label, {
                    font: font,
                    size: textSize,
                    height: textSize * 0.2,
                });

                const textMaterial = new THREE.MeshBasicMaterial({ color });
                const textMesh = new THREE.Mesh(textGeometry, textMaterial);
                const midPoint = new THREE.Vector3().lerpVectors(startPoint, endPoint, 0.5);
                textMesh.position.copy(midPoint);
                textMesh.userData.isAnnotation = true;
                textMesh.userData.viewCam = true;
                if (cotationCheckbox.checked) {
                    textMesh.visible = true;
                } else {
                    textMesh.visible = false;
                }
                textMeshes.push(textMesh);
                currentModel.model.add(textMesh);
            },
            undefined,
            function (error) {
                console.error('Error loading font:', error);
            }
        );
        }

        computeChildrenBoundingBox() {
        const currentBoundingBox = new THREE.Box3().setFromObject(this.model, true);
        const currentCenterBbox = currentBoundingBox.getCenter(new THREE.Vector3());
        this.maxDistance = Math.max(this.size.x, this.size.y, this.size.z);
        let index = 0;
        this.model.traverse((child) => {
            if (child.isMesh && child.geometry) {

                const boundingBoxChild = new THREE.Box3().setFromObject(child, true);
                const massCenterChild = boundingBoxChild.getCenter(new THREE.Vector3());
                const direction = new THREE.Vector3().subVectors(massCenterChild.clone(), currentCenterBbox).normalize();
                this.directionVectors.push(direction.clone());
                this.originalPositions.push(child.position.clone());
                index ++;
            }
        });

        }
        
        logProperties() {
        console.log('Bounding Box:', this.boundingBox);
        console.log('Center:', this.center);
        console.log('Size:', this.size);
        }
    }

    function updatePlanePosition() {
        if (currentModel) {
        const distanceToCamera = camera.position.length();
        const boundingBox = new THREE.Box3().setFromObject(currentModel.model);
        const maxSize = boundingBox.getSize(new THREE.Vector3()).length();
        camera.getObjectByName('planeBG').position.set(0, 0, -(distanceToCamera + maxSize/2));
        }
    }

    repereCheckbox.addEventListener('change', function () {
        const repere = scene.getObjectByName("maskQuadSquare");
        if (this.checked && blackModeCheckbox.checked) {
            repere.visible = true;
        } else {
            repere.visible = false;
        }
        });

    function findMeshInGroup(group) {
        for (let i = 0; i < group.children.length; i++) {
            const child = group.children[i];
            if (child instanceof THREE.Mesh) {
                console.log("Found a Mesh:", child);
                return child;
            }
        }

        console.log("No Mesh found in the group.");
        return null;
    }

    blackModeCheckbox.addEventListener('change', function () {
        const plane = camera.getObjectByName('planeBG');
        const overlay = scene.getObjectByName("maskQuad");
        const overlaySquare = scene.getObjectByName("maskQuadSquare");

        if (this.checked) {
        renderer.setClearColor(0x000000, 1);
        plane.material.opacity = 0;
        overlay.visible = true;
        if (repereCheckbox.checked) {
            overlaySquare.visible = true;
        }
        } else {
        renderer.setClearColor(0xffffff, 1);
        plane.material.opacity = 0.5;
        overlay.visible = false;
        overlaySquare.visible = false;
        }
        plane.material.needsUpdate = true;
    });

    function setLightPositions() {
        console.log("light called");

        const boundingBox = new THREE.Box3().setFromObject(currentModel.model);
        const size = boundingBox.getSize(new THREE.Vector3());
        const maxDimension = Math.max(size.x, size.y, size.z);
        const lightDistance = maxDimension * 3;

        camera.getObjectByName('planeBG').clear();

        const keyLight = new THREE.DirectionalLight(0xffffff, 1);
        keyLight.position.set(lightDistance, lightDistance / 2, lightDistance * 2);
        keyLight.castShadow = true;
        keyLight.shadow.mapSize.width = 2048*8;
        keyLight.shadow.mapSize.height = 2048*8;

        keyLight.shadow.camera.left = -maxDimension*5;
        keyLight.shadow.camera.right = maxDimension*5;
        keyLight.shadow.camera.top = maxDimension*5;
        keyLight.shadow.camera.bottom = -maxDimension*5;
        keyLight.shadow.camera.near = 0.1;
        keyLight.shadow.camera.far = lightDistance*5;
        keyLight.shadow.normalBias = 0.05;
        camera.getObjectByName('planeBG').add(keyLight);

        const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
        fillLight.position.set(-lightDistance, lightDistance / 2, lightDistance);
        fillLight.castShadow = false;
        camera.getObjectByName('planeBG').add(fillLight);

        const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
        backLight.position.set(0, lightDistance / 2, -lightDistance);
        backLight.castShadow = false;
        camera.getObjectByName('planeBG').add(backLight);
    }

    document.getElementById('recenter-button').addEventListener('click', () => {
        if (currentModel) {
            focusOnObject();
        } else {
            console.log('No model loaded to recenter.');
        }
    });

    function focusOnObject() {
        if (!currentModel || !camera) {
            console.warn("currentModel or camera is not initialized yet");
            return;
        }

        currentModel.model.visible = true;

        const maxDim = Math.max(currentModel.size.x, currentModel.size.y, currentModel.size.z);
        console.log(maxDim);
        const fov = camera.fov * (Math.PI / 180);
        let cameraDistance = maxDim / (2 * Math.tan(fov / 2));
        cameraDistance *= 1.5;
        console.log("cameraDistance");
        console.log(cameraDistance);
        const direction = new THREE.Vector3(0, 0, cameraDistance);
        const center = new THREE.Vector3(0, 0, 0);
        camera.position.copy(center).add(direction);
        camera.lookAt(center);

        if (controls) {
            controls.target.copy(center);
            controls.update();
        }

        renderer.render(scene, camera);
        console.log("FOCUS ON OBJECT");
    }

    function animate() {
        requestAnimationFrame(animate);
        if (mixer) mixer.update(0.01);

        if (currentModel) {
        updateCameraAndControls();
        if (currentModel.pointingAxis === 'y') {
            scene.getObjectByName('nullObject').rotation.y += (rotationSpeed * Math.PI / 180) * (1 / 60);
        } else {
            scene.getObjectByName('nullObject').rotation.z += (rotationSpeed * Math.PI / 180) * (1 / 60);
        }
        }
        
        scene.traverse((child) => {
        if (child.userData.viewCam && child.userData.isAnnotation) {
            child.lookAt(camera.position);
        }
        });
        
        controls.update(); 
        renderer.render(scene, camera);
        }

    autoRotateCheckbox.addEventListener('change', function () {
        if (this.checked) {
        isRotating = true;
        easeInRotation();
        } else {
        isRotating = false;
        easeOutRotation();
        }
    });

    function easeInRotation() {
        isEasing = true;
        const easeIn = () => {
        if (rotationSpeed < targetSpeed && isRotating) {
            rotationSpeed += easingFactor * (targetSpeed - rotationSpeed);
            requestAnimationFrame(easeIn); 
        } else {
            rotationSpeed = targetSpeed; 
            isEasing = false;
        }
        };
        easeIn();
    }

    function easeOutRotation() {
        isEasing = true;
        const easeOut = () => {
        if (rotationSpeed > 0 && !isRotating) {
            rotationSpeed -= easingFactor * rotationSpeed;
            requestAnimationFrame(easeOut);
        } else {
            rotationSpeed = 0;
            isEasing = false;
            }
        };
        easeOut();
    }

    function adjustCameraDistance() {
        const viewerHeight = window.innerHeight;
        const radius = viewerHeight / 2;
        const objectSize = currentModel.model.scale.length();

        const fov = camera.fov * (Math.PI / 180);
        const distance = (objectSize / 2) / Math.tan(fov / 2); 
    
        camera.position.set(0, 0, distance);
        camera.updateProjectionMatrix();
    }

    function startExplosionAndAdjustCamera(skip = false) {
    const explosionDistanceInput = parseFloat(document.getElementById('explosionDistance').innerText);

    if (!currentModel || (previousDistanceValue === explosionDistanceInput && !skip)) {
        return;
    }

    previousDistanceValue = explosionDistanceInput;
    const height = currentModel.size ? currentModel.size.y : 0;
    const userDefinedDistance = (explosionDistanceInput / 100) * height;

    const directionVectors = currentModel.directionVectors || [];
    const originalPositions = currentModel.originalPositions || [];

    if (directionVectors.length !== originalPositions.length) {
        console.error("Mismatch between directionVectors and originalPositions lengths");
        return;
    }

    let index = 0;

    currentModel.model.traverse((child) => {
        if (child.isMesh && child.name !== '') {

            if (index < directionVectors.length) {
                const direction = directionVectors[index].clone();
                const newPosition = originalPositions[index].clone().add(direction.multiplyScalar(userDefinedDistance));
                gsap.to(child.position, {
                    x: newPosition.x,
                    y: newPosition.y,
                    z: newPosition.z,
                    duration: 0.5,
                    ease: "power2.out",
                });
                index++;
            } else {
                console.error(`Index ${index} exceeds directionVectors array length`);
            }
        }
    });

    }


    cotationCheckbox.addEventListener('change', function() {
        scene.traverse((child) => {
        if (child.userData.isAnnotation) {
            if (this.checked) {
            child.visible = true;
            } 
            else {
            child.visible = false;
            }
        }
        });
    });

    function getObjectHeight(object) {
        const box = new THREE.Box3().setFromObject(object);
        return box.max.y - box.min.y;
    }

    function clearPreviousAnnotations() {
        const toRemove = [];
        scene.traverse((child) => {
            if (child.userData.isAnnotation) {
                toRemove.push(child);
            }
        });
        toRemove.forEach(child => {
            scene.remove(child);
        });

        annotations = [];
    }

    async function cleanAndLoadItem(selectedItem) {
        if (currentModel) {
            scene.getObjectByName('nullObject').remove(currentModel.model);
            currentModel = null;
            directionVectors = [];
            originalPositions = [];
        }
    
        if (selectedItem) {
            console.log("Starting fetchDynamoData");
            let files = await fetchDynamoData(false, selectedItem);
            console.log("fetchDynamoData complete:", files);
            files = files[0];

            const objectsUrls = files.objectsUrls.split(",").join(",");
            const animationsUrls = files.animationsUrls.split(",").join(",");
            const texturesUrls = files.texturesUrls.split(",").join(",");
            const mtlUrls = files.mtlUrls.split(",").join(",");
            const otherUrls = files.otherUrls.split(",").join(",");;

            console.log({ objectsUrls, animationsUrls, texturesUrls, mtlUrls, otherUrls });
    
            if (animationsFiles) {
                parseAndPopulateAnimations(modelFile, animationsFiles, mtlFile, texturesFiles);
            } else {
                animationSelect.style.display = 'none';
                await loadAndGroupModels(objectsUrls, texturesUrls, mtlUrls);
            }
    
            startExplosionAndAdjustCamera(true);
        }
    }
    
    selectBox.addEventListener("change", async (event) => {
        const selectedItem = event.target.value;
        console.log(selectedItem);
        cleanAndLoadItem(selectedItem);
    });

    function playAnimation(animationUrl) {
        loadGLTF(animationUrl, false, false);
    }

    function parseAndPopulateAnimations(file, animationsFiles, mtlFile = null, texturesFiles = null) {
        let animationsArray = animationsFiles.split(',').map(link => link.trim());
        animationSelect.innerHTML = '';

        if (animationsArray.length > 0) {
            animationSelect.style.display = 'block';
            const noAnimationOption = document.createElement('option');
            noAnimationOption.value = file;
            noAnimationOption.text = 'No Animation';
            animationSelect.appendChild(noAnimationOption);
            animationsArray.forEach((anim, index) => {
                let option = document.createElement('option');
                option.value = anim;
                option.text = `Animation ${index + 1}`;
                animationSelect.appendChild(option);
            });

        } else {
            animationSelect.style.display = 'none';
        }

        if (animationsArray.length > 0) {
            await loadAndGroupModels(objectsUrls, texturesUrls, mtlUrls);
        }

        animationSelect.addEventListener('change', () => {
            if (currentModel) {
            scene.getObjectByName('nullObject').remove(currentModel.model);
            currentModel = null;
            }
            const selectedAnimation = animationSelect.value;
            if (animationSelect.selectedIndex === 0)
            {
                await loadAndGroupModels(objectsUrls, texturesUrls, mtlUrls);
            }
            else {
            playAnimation(selectedAnimation);
            }
            focusOnObject();
        });
    }

    function getBasePath(url) {
        const parsedUrl = new URL(url);
        const path = parsedUrl.pathname;
        const basePath = path.substring(0, path.lastIndexOf('/') + 1);
        
        return `${parsedUrl.origin}${basePath}`;
    }
    
    function showLoading() {
        console.log('SHOW LOADING');
        document.getElementById('3d-viewer').style.display = 'none';
        document.querySelector('.loading-container').style.display = 'flex';
    }

    function hideLoading() {
        document.getElementById('3d-viewer').style.display = 'block';
        document.querySelector('.loading-container').style.display = 'none';
    }

    async function initializeOcct() {
        if (!occtInitialized) {
        occt = await occtimportjs({
            locateFile: () => wasmUrl,
        });
        occtInitialized = true;
        }
    }
    
    async function LoadStep(fileUrl) {
        await initializeOcct();
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        const fileBuffer = new Uint8Array(buffer);
        const result = occt.ReadStepFile(fileBuffer);
        const targetObject = new THREE.Object3D();
        
        for (let i = 0; i < result.meshes.length; i++) {
        const resultMesh = result.meshes[i];
        const positionArray = new Float32Array(resultMesh.attributes.position.array);
        const indexArray = new Uint16Array(resultMesh.index.array);

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3));
        if (resultMesh.attributes.normal) {
            const normalArray = new Float32Array(resultMesh.attributes.normal.array);
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normalArray, 3));
        }
        geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

        let color;
        if (resultMesh.color && resultMesh.color.length === 3) {
            const [r, g, b] = resultMesh.color;
            color = new THREE.Color(
            r <= 1 ? r : r / 255,
            g <= 1 ? g : g / 255,
            b <= 1 ? b : b / 255
            );
        } else if (resultMesh.layer && resultMesh.layer.color) {
            const [r, g, b] = resultMesh.layer.color;
            color = new THREE.Color(r / 255, g / 255, b / 255);
        } else if (resultMesh.group && resultMesh.group.color) {
            const [r, g, b] = resultMesh.group.color;
            color = new THREE.Color(r / 255, g / 255, b / 255);
        } else if (resultMesh.material && resultMesh.material.color) {
            const [r, g, b] = resultMesh.material.color;
            color = new THREE.Color(r / 255, g / 255, b / 255);
        } else {
            color = new THREE.Color(0xcccccc);
        }

        const opacity = resultMesh.opacity !== undefined ? resultMesh.opacity : 1.0;

        const material = new THREE.MeshStandardMaterial({
            color: color,
            transparent: opacity < 1.0,
            opacity: opacity,
            roughness: 0.5,
            metalness: 0.0,
        });

        material.polygonOffset = true;
        material.polygonOffsetFactor = 1;
        material.polygonOffsetUnits = 1;

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = resultMesh.name || `Part ${i + 1}`;

        targetObject.add(mesh);
        }

        return targetObject;
    }

    function getBaseName(url) {
        const fileName = url.split('/').pop();
        return fileName.split('.')[0];
      }
      
    const modelBaseNames = models.map(getBaseName);
    const textureBaseNames = textures.map(getBaseName);
    
    function matchModelsWithTextures(models, textures) {
        const matchedTextures = {};
        
        models.forEach(modelUrl => {
            const baseName = getBaseName(modelUrl);
            const matchingTextures = textures.filter(textureUrl => getBaseName(textureUrl) === baseName);
        
            if (matchingTextures.length > 0) {
            matchedTextures[baseName] = matchingTextures;
            } else {
            matchedTextures[baseName] = [];
            }
        });
    
    return matchedTextures;
    }
      
    const matchedResults = matchModelsWithTextures(models, textures);

    async function loadAndGroupModels(objectsUrls, texturesUrls, mtlUrls) {
        const group = new THREE.Group();
        const urls = objectsUrls.split(',');
        const textures = texturesUrls.split(',');
        showLoading();

        for (let i = 0; i < urls.length; i++) {
            const url = urls[i];
            const texture = textures[i];

            try {
                const model = await loadModel(url, fileType);
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                const finalModel = model;
                applyMaterialToMeshModel(finalModel, textureUrlsList);
                group.add(finalModel);
            } catch (error) {
                console.error(`Error loading model from ${url}:`, error);
                }
        }

        console.log("All models loaded, textures applied, and grouped.");
        const modelWrapper = new ModelWrapper(group);
        addModelToScene(modelWrapper);
        hideLoading();
        return modelWrapper;
    }

    async function loadModel(file, fileType) {
        const fileTypeLower = fileType.toLowerCase();
        if (fileTypeLower === 'step' || fileTypeLower === 'stp') {

            const mainObject = await LoadStep(file);
            return mainObject;
        }
        const loader = loaders[fileType.toLowerCase()];
        if (!loader) throw new Error(`Unsupported file type: ${fileType}`);

        if (fileTypeLower === 'gltf' || fileTypeLower === 'glb') {
            const gltf = await loader.loadAsync(file);

            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new AnimationMixer(gltf.scene);
                gltf.animations.forEach((clip) => mixer.clipAction(clip).play());
                gltf.scene.userData.mixer = mixer;
            }
            
            return gltf.scene;
        }
        const model = await loader.loadAsync(file);
        return (fileTypeLower === 'stp' || fileTypeLower === 'step'|| fileTypeLower === 'stl' || fileTypeLower === 'ply')
            ? applyBasicMaterial(model)
            : model;
    }

    function applyBasicMaterial(geometry) {
        const material = new MeshStandardMaterial({ color: 0xdddddd });
        return new Mesh(geometry, material);
    }

    async function convertToGLTF(model, fileType, url) {
        const exporter = new THREE.GLTFExporter();
        return new Promise((resolve, reject) => {
            exporter.parse(model, (gltfData) => {
                console.log(`Converted ${fileType} model from ${url} to glTF format.`);
                const json = JSON.stringify(gltfData);
                const blob = new Blob([json], { type: 'application/json' });
                const loader = new THREE.GLTFLoader();
                loader.load(URL.createObjectURL(blob), (gltf) => {
                    resolve(gltf.scene);
                }, undefined, (error) => {
                    console.error(`Error loading GLTF from Blob:`, error);
                    reject(error);
                });
            }, { binary: false }); 
        });
    }

    function addModelToScene(modelWrapper) {
        const nullObject = scene.getObjectByName('nullObject');
        if (nullObject) {
            nullObject.add(modelWrapper.model);
            console.log("Model added to nullObject in the scene.");
        } else {
            console.error("NullObject not found in the scene.");
        }

        currentModel = modelWrapper;
        console.log(currentModel);

        setLightPositions();
        updateMinDistanceBasedOnBoundingBox();
        createDynamicDropdown(currentModel.model);

        if (currentModel.model && currentModel.model.geometry && currentModel.model.material) {
            focusOnObject();
        } else {
            console.warn("Model not fully loaded yet. Waiting for geometry and material.");
            waitForModelReady();
        }
    }

    function waitForModelReady() {
        const intervalId = setInterval(() => {
            if (currentModel.model && currentModel.model.geometry && currentModel.model.material) {
                clearInterval(intervalId);
                focusOnObject();
            }
        }, 100);
    }


    function applyMaterialToMeshModel(model, textureUrls) {
        const hasUVs = model.geometry && model.geometry.attributes.uv;
        let materialPBR;
        if (textureUrls.length > 0 && hasUVs) {
            materialPBR = createPBRMaterial(textureUrls);
            model.traverse((child) => {
                if (child.isMesh) {
                    console.log(child.name);
                    child.material = materialPBR;
                    child.material.needsUpdate = true;
                }
            });
        } 
    }


    function createPBRMaterial(s3Urls) {
        const textureUrls = createTextureUrls(s3Urls);
        const materialParams = {};
        for (const [mapName, aliases] of Object.entries(PBR_MAPS)) {
            for (const alias of aliases) {
                const textureUrl = textureUrls[mapName];
                if (textureUrl) {
                    console.log(`mapName: ${mapName}`);
                    materialParams[mapName] = textureLoader.load(textureUrl, (texture) => {
                        console.log(`Loaded texture: ${textureUrl}`);
                    }, undefined, (error) => {
                        console.error(`Error loading texture: ${textureUrl}`, error);
                    });
                    break;
                }
            }
        }
        console.log(materialParams);
        return new THREE.MeshStandardMaterial(materialParams);
    }

    function createTextureUrls(urls) {
        const textureUrls = {};

        for (const [mapType, names] of Object.entries(PBR_MAPS)) {
            for (const name of names) {
                const regex = new RegExp(`.*${name}.*`, 'i');
                const matchingUrl = urls.find(url => regex.test(url));
                
                if (matchingUrl) {
                    textureUrls[mapType] = matchingUrl;
                    break;
                }
            }
        }

        return textureUrls;
    }

    function updateMinDistanceSmoothly(controls, newMinDistance, duration = 1.0) {
        const startMinDistance = controls.minDistance;
        let startTime = null;

        function animate(time) {
            if (!startTime) startTime = time;
            const elapsed = (time - startTime) / 1000;
            const t = Math.min(elapsed / duration, 1);
            controls.minDistance = THREE.MathUtils.lerp(startMinDistance, newMinDistance, t);
            controls.update();

            if (t < 1) {
                requestAnimationFrame(animate);
            }
        }

        requestAnimationFrame(animate);
    }

    function updateMinDistanceBasedOnBoundingBox() {
        const boundingBox = new THREE.Box3().setFromObject(currentModel.model);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const maxDimension = Math.max(size.x, size.y, size.z);
        const newMinDistance = maxDimension * 1.3;

        updateMinDistanceSmoothly(controls, newMinDistance, 1.0);
    }

    function createDynamicDropdown(model) {
        const container = document.getElementById('modelDropdownContainer');

        container.innerHTML = '';

        const dropdown = document.createElement('div');
        dropdown.classList.add('dropdown');

        const toggle = document.createElement('div');
        toggle.classList.add('dropdown-toggle');
        toggle.innerHTML = '<span>Modèle</span>';
        dropdown.appendChild(toggle);

        const dropdownList = document.createElement('div');
        dropdownList.classList.add('dropdown-list', 'hide');

        toggle.addEventListener('click', (event) => {
            event.stopPropagation();
            if (dropdownList.classList.contains('hide')) {
                dropdownList.classList.remove('hide');
                dropdownList.classList.add('show');
            } else {
                dropdownList.classList.remove('show');
                dropdownList.classList.add('hide');
            }
        });

        document.addEventListener('click', (event) => {
            if (!dropdown.contains(event.target)) {
                dropdownList.classList.remove('show');
                dropdownList.classList.add('hide');
            }
        });

        dropdownList.addEventListener('click', (event) => {
            event.stopPropagation();
        });

        const parentItem = document.createElement('div');
        parentItem.classList.add('dropdown-item');

        const parentCheckbox = document.createElement('input');
        parentCheckbox.type = 'checkbox';
        parentCheckbox.id = selectBox.value;
        parentCheckbox.checked = true;

        const parentLabel = document.createElement('label');
        parentLabel.htmlFor = selectBox.value;
        parentLabel.innerText = selectBox.value;

        parentItem.appendChild(parentCheckbox);
        parentItem.appendChild(parentLabel);
        dropdownList.appendChild(parentItem);

        parentCheckbox.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
            dropdownList.querySelectorAll('.dropdown-item input[type="checkbox"]').forEach((checkbox) => {
                if (checkbox !== parentCheckbox) {
                    checkbox.checked = isChecked;
                    const meshName = checkbox.name;
                    const child = model.getObjectByName(meshName);
                    if (child) {
                        child.visible = isChecked;
                    }
                }
            });
        });

        model.traverse((child) => {
        if (child.isMesh && child.name != '') {
            const listItem = document.createElement('div');
            listItem.classList.add('dropdown-item', 'child');
    
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = child.name;
            checkbox.name = child.name;
            checkbox.checked = true;
    
            const label = document.createElement('label');
            label.htmlFor = child.name;
            label.innerText = child.name;
    
            checkbox.addEventListener('change', (event) => {
                child.visible = event.target.checked;
    
                const allChecked = Array.from(dropdownList.querySelectorAll('.dropdown-item input[type="checkbox"]'))
                    .filter((cb) => cb !== parentCheckbox)
                    .every((cb) => cb.checked);
    
                parentCheckbox.checked = allChecked;
            });
    
            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            dropdownList.appendChild(listItem);
        }
    });

        dropdown.appendChild(dropdownList);
        container.appendChild(dropdown);
    }

    function updateCameraAndControls() {
        const box = new THREE.Box3().setFromObject(currentModel.model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const maxDimension = Math.max(size.x, size.y, size.z) / 2;
        const minDistance = maxDimension * distanceScaleFactor;
        controls.minDistance = minDistance;

        const currentDistance = camera.position.distanceTo(center);
        if (currentDistance < minDistance) {
            const direction = new THREE.Vector3().subVectors(camera.position, center).normalize();
            targetPosition.copy(direction.multiplyScalar(minDistance).add(center));
            camera.position.lerp(targetPosition, smoothFactor);
        }
        
        camera.lookAt(center);
    }

    init3DViewer();

  });
</script>