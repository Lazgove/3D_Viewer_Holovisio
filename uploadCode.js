<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Custom File Uploader</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #f2f2f2;
        }
    
        h2 { 
            font-size: 2em;
        }

        .upload-form form {
            background: #f2f2f2;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 0 0px rgba(0, 0, 0, 0.1);
            margin: 0 auto;
            font-size: 1em;
        }
    
        input[type="file"] {
            margin: 10px 0;
            display: none; /* Hide the default file input */
        }
    
        .drag-drop-area {
            border: 2px dashed #ccc;
            padding: 50px;
            text-align: center;
            margin: 10px 0;
            border-radius: 5px;
            background: #f2f2f2;
            transition: background 0.3s;
            height: 200%;
            width: 100%;
            margin: 20px auto;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 1.5em;
            line-height: 2vh;
        }
    
        .drag-drop-area.dragover {
            background: #e1f7e1;
        }
    
        #file-list {
            margin-top: 10px;
            border: 1px solid #ccc;
            padding: 10px;
            max-height: 200px;
            overflow-y: auto;
        }
    
        #file-list div {
            margin: 5px 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    
        .remove-file {
            color: red;
            cursor: pointer;
            margin-left: 10px;
        }
    
        button[type="submit"] {
            background-color: #4CAF50;
            color: white;
            padding: 10px 20px;
            margin-top: 10px; /* Adds space above the input */
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 1.2em;
            transition: background-color 0.3s;
        }
    
        button[type="submit"]:hover {
            background-color: #45a049;
        }
    
        .category {
            margin-top: 20px;
            font-weight: bold;
        }
    
        #file-name-input {
            width: 20%;
            max-width: 750px;
            min-width: 200px; /* Full width of its container */
            padding: 10px 15px; /* Vertical and horizontal padding */
            margin-right: 20px;
            font-size: 1.5em;
            border: 2px solid #ccc; /* Border style */
            border-radius: 5px; /* Rounded corners */
            outline: none; /* Remove the outline on focus */
            box-sizing: border-box; /* Includes padding and border in width/height */
            margin-top: 10px; /* Adds space above the input */
            transition: border-color 0.3s; /* Smooth transition for border color */
        }
    
        /* Style for placeholder text */
        #file-name-input::placeholder {
            color: #aaa; /* Placeholder text color */
            font-style: italic; /* Italic placeholder text */
        }
    
        /* Style for input on focus */
        #file-name-input:focus {
            border-color: #4CAF50; /* Change border color on focus */
            box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); /* Adds a soft shadow */
        }
    
        .loading-container {
            display: flex;                     
            flex-direction: column;           
            justify-content: center;          
            align-items: center;              
            height: 100vh;                    
            width: 100vw;                     
            position: fixed;                  
            top: 0;                           
            left: 0;                          
            background-color: rgba(255, 255, 255, 0.9); 
            backdrop-filter: blur(10px);      
            z-index: 1000;                   
            display: none;                    
            border-radius: 10px;              
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2); 
        }

        /* HTML: <div class="loader"></div> */
        .loader {
            width: 50px;
            aspect-ratio: 1;
            border-radius: 50%;
            background: 
            radial-gradient(farthest-side,#ffa516 94%,#0000) top/8px 8px no-repeat,
            conic-gradient(#0000 30%,#ffa516);
            -webkit-mask: radial-gradient(farthest-side,#0000 calc(100% - 8px),#000 0);
            animation: l13 1s infinite linear;
        }
        @keyframes l13{ 
            100%{transform: rotate(1turn)}
        }

        /* Basic styling for the tree view */
        .tree-node {
            margin-bottom: 10px;
            padding: 5px;
            border: 1px solid #ccc;
            border-radius: 4px;
        }

        .object-container {
            display: flex;
            align-items: left;
            margin-bottom: 10px; /* Space between object and its subcategories */
            flex-direction: column; /* Align items vertically */
            gap: 2.5px; /* Optional: space between items */
        }

        .parent-node {
            font-weight: bold;
            margin-right: 10px; /* Space between the object name and the toggle button */
        }

        .toggle {
            cursor: pointer;
        }

        .tree-children {
            padding-left: 20px; /* Indentation for child nodes */
            margin-top: 10px; /* Increased margin for better visibility */
        }

        .tree-children.hidden {
            display: none;
        }

        .sub-node {
            margin-left: 20px; /* Additional indentation for subcategories */
            margin-top: 10px; /* Margin between subcategories */
            display: flex;
            align-items: left;
            flex-direction: column; /* Align items vertically */
            gap: 2.5px; /* Optional: space between items */
        }

        .sub-node-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 5px; /* Space below the title for files */
        }

        .file-container {
            margin-top: 5px;
            padding-left: 10px; /* Space between subcategory title and files */
            display: flex;
            flex-direction: column; /* Align items vertically */
            gap: 2.5px; /* Optional: space between items */
        }

        .file-item {
            display: flex;  /* Ensure each file item is on its own line */
            padding: 2px 0;
            margin-bottom: 5px; /* Add margin to space out the file items */
        }

        .remove-file {
            margin-left: 10px;
            cursor: pointer;
            color: red;
            font-size: 12px;
        }

        /* Add hover effect for remove button */
        .remove-file:hover {
            text-decoration: underline;
        }

        .tree-view ul {
            list-style-type: none;
            padding-left: 20px;
        }

        .caret {
            cursor: pointer;
            user-select: none;
        }

        .nested {
            display: none;
            padding-left: 20px;
        }

        .caret-down::before {
            content: "▼";
        }

        .caret-up::before {
            content: "▲";
        }

        .node-actions {
            display: inline-block;
            margin-left: 10px;
        }

        button {
            margin-left: 5px;
        }
        
        li button {
            margin-left: auto; /* Push the button to the far right */
        }

        space {
            display: flex;                /* Use flexbox layout */
            justify-content: space-between; /* Space between the text and the button */
            align-items: center;          /* Align items vertically */
            padding: 5px 0;               /* Add spacing between items */
        }

        spaceChild {
            display: flex;                /* Use flexbox layout */
            justify-content: space-between; /* Space between the text and the button */
            align-items: center;          /* Align items vertically */
            padding: 5px 0;               /* Add spacing between items */
        }

    </style>
    
</head>
<body>
    <form id="upload-form">
        <h2>Charger un nouveau fichier</h2>
        <div class="drag-drop-area" id="drag-drop-area">
            <p>Glisser et déposer ici, ou <span id="file-select" style="color: blue; cursor: pointer;">rechercher mon fichier</span></p>
        </div>
        <input type="file" id="file-input" multiple>
        <!-- Input field for text -->
        <input type="text" id="file-name-input" placeholder="Nom de votre objet">
        <button type="submit">Ajouter</button>
        <ul id="file-list"></ul>
    </form>

    <div class="loading-container">
        <svg id="loader" class="loader" viewBox="-10 -10 120 120"></svg>
        <div id="loading-text" class="loading-text">Importation...</div>
        <div id="ending-text" class="ending-text">Tous les fichiers ont été uploadés !</div>
    </div>
    
    <script>
        document.addEventListener('DOMContentLoaded', function() {
            let userID = "";
            (async () => {
                try {
                    const { data: member } = await window.$memberstackDom.getCurrentMember();
                    if (member) {
                    userID = member.id;
                    console.log("User ID:", userID);
                    // Add your logic here that depends on userID
                    } else {
                    console.log("No member logged in.");
                    }
                } catch (error) {
                    console.error("Error fetching MemberStack user data:", error);
                }
                })();
            
            const form = document.getElementById('upload-form');
            const objectNameInput = document.getElementById('file-name-input');
            const fileInput = document.getElementById('file-input');
            const fileList = document.getElementById('file-list');
            const dragDropArea = document.getElementById('drag-drop-area');
            const fileSelect = document.getElementById('file-select');

            var fileNameNoExt = '';

            // Categories for files
            const categories = {
                objects: [],
                mtl: [],
                animations: [],
                textures: []
            };

            let currentFolder = ''; // Variable to hold the current folder name

            fileSelect.addEventListener('click', () => {
                fileInput.click();
            });

            function displayFiles() {
                fileList.innerHTML = ''; // Clear the list
                const ul = document.createElement('ul');
            
                // Helper function to create a nested structure
                function createNestedStructure(parentLi, titleText, items, parentData) {
                    const ulChild = document.createElement('ul');
                    const titleElement = document.createElement('h5');
                    titleElement.textContent = titleText;
                    console.log(titleText);
            
                    parentLi.appendChild(ulChild);
                    ulChild.parentNode.insertBefore(titleElement, ulChild);
            
                    items.forEach((item, index) => {
                        const liChild = document.createElement('li');
                        const placeChild = document.createElement('div');
                        const span = document.createElement('span');
                        span.classList.add('caret');
                        span.textContent = item.name;
            
                        const actions = document.createElement('span');
                        actions.classList.add('node-actions');
            
                        // Add remove button
                        const removeBtn = document.createElement('button');
                        removeBtn.textContent = "Supprimer";
                        removeBtn.addEventListener('click', function () {
                            removeNode(index, parentData);
                        });
                        actions.appendChild(removeBtn);
                        placeChild.appendChild(span);
                        placeChild.appendChild(actions);
                        ulChild.appendChild(placeChild);
                    });
                }
            
                // Main loop to process objects
                categories.objects.forEach((fileObj, index) => {
                    const li = document.createElement('li');
                    const place = document.createElement('div');
                    const span = document.createElement('span');
                    span.classList.add('caret');
                    span.textContent = fileObj.file.name;
            
                    const actions = document.createElement('span');
                    actions.classList.add('node-actions');
            
                    // Add remove button
                    const removeBtn = document.createElement('button');
                    removeBtn.textContent = "Supprimer";
                    removeBtn.addEventListener('click', function () {
                        removeNode(index, categories.objects);
                    });
                    actions.appendChild(removeBtn);
                    place.appendChild(span);
                    place.appendChild(actions);
                    li.append(place);
                    ul.appendChild(li);

                    // Add nested structures for textures, mtl, and animations
                    if (fileObj.textures && fileObj.textures.length > 0) {
                        createNestedStructure(li, 'Textures', fileObj.textures, fileObj.textures);
                    }
            
                    if (fileObj.mtl && fileObj.mtl.length > 0) {
                        createNestedStructure(li, 'MTL', fileObj.mtl, fileObj.mtl);
                    }
            
                    if (fileObj.animations && fileObj.animations.length > 0) {
                        createNestedStructure(li, 'Animations', fileObj.animations, fileObj.animations);
                    }
                });
            
                // Add the main list to the DOM
                fileList.appendChild(ul);
            
                // Add the title above the list
                const titleElementMain = document.createElement('h4');
                titleElementMain.textContent = 'Objets';
                ul.parentNode.insertBefore(titleElementMain, ul);
            }
            
            // Function to remove a node
            function removeNode(index, parentData) {
                parentData.splice(index, 1); // Remove the node from parentData
                displayFiles(); // Re-render the tree after removal
            }

            // ###                              ###     
            // ###      ADD TO CATEGORIES       ###
            // ###                              ###

            function addObject(fileObj, textures = [], mtl = [], animations = []) {
                const newObject = {
                    file: fileObj.file,
                    folderName: fileObj.folderName,
                    fileName: fileObj.fileName,
                    textures: textures,
                    mtl: mtl,
                    animations: animations
                };

                categories.objects.push(newObject);
                //console.log(newObject);
                displayFiles();
            }

            // Unified function to add a file (texture, MTL, or animation) to an existing object
            function addFile(objectIndex, fileType, file) {
                if (!categories.objects[objectIndex]) {
                    console.error("Object not found");
                    return;
                }
                
                const object = categories.objects[objectIndex];
                object.textures.push(file);

                displayFiles(); // Re-render after updating
            }

            // Utility function to get the file extension
            function getFileExtension(filename) {
                console.log(filename);
                return filename.split('.').pop().toLowerCase();
            }

            function getFileNameWithoutExtension(file) {
                // Check if the input is a File object
                if (!(file instanceof File)) {
                  throw new Error('Input must be a File object');
                }
              
                // Get the file name
                const fullFileName = file.name;
              
                // Extract the name without the extension
                const fileNameWithoutExtension = fullFileName.slice(0, fullFileName.lastIndexOf('.'));
              
                // Return the name without the extension
                return fileNameWithoutExtension;
              }
              
              function categorizeFileType(file) {
                const extension = getFileExtension(file.name).toLowerCase();
            
                // Define categories for each type
                const textureExtensions = ['jpg', 'jpeg', 'png', 'bmp', 'gif', 'tiff', 'tif', 'webp', 'exr', 'hdr'];
                const animationExtensions = ['fbx', 'glb', 'gltf', 'bvh', 'abc', 'dae'];
                const mtlExtensions = ['mtl'];
            
                // Categorize based on extension
                if (textureExtensions.includes(extension)) {
                    return 'texture';
                } else if (animationExtensions.includes(extension)) {
                    return 'animation';
                } else if (mtlExtensions.includes(extension)) {
                    return 'mtl';
                } else {
                    return 'unknown'; // If the extension doesn't match any category
                }
            }

            // Categorize files based on file extension
            function categorizeFile(file) {

                const ext = file.name.split('.').pop().toLowerCase();
                const folderName = objectNameInput.value;

                if (['obj', 'fbx', 'ply', 'stl', 'step', 'stp'].includes(ext)) {
                    const fileObj = {
                        file,
                        folderName,
                        fileName: file.name,
                        textures: [],
                        animations: [],
                        mtl: []
                    };

                    addObject(fileObj);
                }
                else {
                    try {
                        // First try to link textures by naming
                        linkByNaming(file);

                    } catch (error) {
                        console.error(error.message);

                        // Fallback to manual linking if naming fails
                        linkManually(objects, textures);
                    }
                }
                
                displayFiles();
            }

            // Function to extract the base name (without extension)
            function getBaseName(filePath) {
                return filePath.split('/').pop().split('.')[0]; // Extracts the base name (without extension)
            }

            // Function to find a single matched file and its index
            function matchFile(fileName, fileList) {

                for (let i = 0; i < fileList.length; i++) {
                    if (fileList[i].name === fileName) {
                        return { file: fileList[i], index: i }; // Return the matched file and its index
                    }
                }

                return null; // Return null if no match is found
            }

            function linkByNaming(file) {

                // Attempt to link textures based on naming
                const baseName = file.name.split('.')[0];
                let matchedObjectIndex = -1; // Initialize to -1 to represent "no match"
                categories.objects.forEach((object, index) => {
                    // Check if the base name matches a substring of the file name (case-insensitive)
                    if (object.file.name.toLowerCase().includes(baseName.toLowerCase())) {
                        matchedObjectIndex = index;
                    }
                });
                console.log('Match Found:');
                console.log(matchedObjectIndex);

                const fileType = categorizeFileType(file);
                
                console.log('File Type:', fileType);

                if (matchedObjectIndex !== -1) { // Check for a valid match
                    addFile(matchedObjectIndex, fileType, file);
                }

                console.log('Processing complete');

            }

            function linkManually(objects, textures) {
                // Manual linking logic
                const manualLinks = {};
                const objectNames = categories.objects.map(obj => obj.fileName);

                for (const objectName of objectNames) {
                    console.log(`Please select a texture for the object: ${objectName}`);
                    // Example: Assume we prompt the user or provide a UI selection for the texture
                    const selectedTexture = textures[0]; // Replace with user selection logic
                    manualLinks[objectName] = selectedTexture;
                }

                return manualLinks;
            }

            // Handle file and folder uploads
            function handleFileUpload(files) {
                for (const file of files) {
                    if (file.webkitRelativePath) {
                        const pathParts = file.webkitRelativePath.split('/');
                        categorizeFile(file);
                    } else {
                        categorizeFile(file);
                    }
                }
            }

            fileInput.addEventListener('change', function() {
                handleFileUpload(fileInput.files);
            });

            dragDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dragDropArea.classList.add('dragover');
            });

            dragDropArea.addEventListener('dragleave', () => {
                dragDropArea.classList.remove('dragover');
            });

            dragDropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dragDropArea.classList.remove('dragover');

                const files = e.dataTransfer.files;
                if (files.length) {
                    handleFileUpload(files);
                }
            });

            function replaceSpacesWithUnderscores(str) {
                return str.replace(/ /g, "-");
            }

            // ###                 ###
            // ###      UPLOAD     ###
            // ###                 ###

            async function uploadToDynamoDB(payload) {

            try { 
                const requestBody = {
                    operation: "addMetadata",
                    payload: payload
                };

                const metadataResponse = await fetch("https://2uhjohkckl.execute-api.eu-west-3.amazonaws.com/production/uploadObject", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(requestBody),
                    });

                    const metadataResult = await metadataResponse.json();

                    if (metadataResponse.ok) {
                    console.log("Metadata added successfully:", metadataResult);
                    } else {
                    console.error("Failed to add metadata:", metadataResult);
                    }
                } catch (error) {
                    console.error("Error during file upload or metadata storage:", error);
                }
            }

            async function getPresignedUrl(file, userID, name, category) {
                try {
                    // 1. Request a pre-signed URL
                    const presignedUrlResponse = await fetch("https://2uhjohkckl.execute-api.eu-west-3.amazonaws.com/production/uploadObject", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            operation: "getPresignedUrl",
                            payload: {
                                userID,
                                name,
                                filename: file.fileName, // Ensure `file.name` is valid
                                category,
                            },
                        }),
                    });

                    console.log(presignedUrlResponse);

                    if (!presignedUrlResponse.ok) {
                        throw new Error(`Failed to fetch presigned URL: ${presignedUrlResponse.statusText}`);
                    }

                    const presignedUrlResponseJson = await presignedUrlResponse.json();
                    const { presignedUrl, s3Key } = JSON.parse(presignedUrlResponseJson.body);

                    console.log(presignedUrl);
                    console.log(s3Key);

                    if (!presignedUrl || !s3Key) {
                        throw new Error("Presigned URL or S3 key is missing in the response.");
                    }

                    // 2. Upload the file to S3 using the pre-signed URL
                    const uploadResponse = await fetch(presignedUrl, {
                        method: "PUT",
                        headers: { "Content-Type": file.type || "application/octet-stream" },
                        body: file,
                    });

                    if (!uploadResponse.ok) {
                        throw new Error(`Failed to upload file to S3: ${uploadResponse.statusText}`);
                    }

                    console.log("File uploaded successfully to S3!");

                    // Return the pre-signed URL and S3 key
                    return { presignedUrl, s3Key };
                } catch (error) {
                    console.error("Error in getPresignedUrl:", error.message);
                    throw error; // Rethrow to propagate the error to the caller
                }
            }


            async function uploadFiles() {

                if (!userID) {
                    alert('User ID not set. Please log in.');
                    return;
                }

                const objectName = document.getElementById('file-name-input').value;
                noSpaceObjectName = replaceSpacesWithUnderscores(objectName);

                // Prepare file data (base64 encoded)
                const fileData = [];

                for (const categoryKey of Object.keys(categories)) {
                    const files = categories[categoryKey];

                    for (const file of files) {
                        if (!(file.file instanceof File)) {
                            throw new Error('The provided value is not a valid File object.');
                        }

                        const { presignedUrl, s3Key } = await getPresignedUrl(file, userID, objectName, categoryKey);

                        fileData.push({
                        category: categoryKey,
                        filename: file.fileName,
                        url: s3Key,
                    });
                }

                // Payload to send to Lambda
                const payload = {
                    userID: userID, 
                    name: noSpaceObjectName,
                    timestamp: new Date().toISOString(),
                    files: fileData
                };
                console.log('payload');
                console.log(payload);
                await uploadToDynamoDB(payload);
            }
        }

            form.addEventListener('submit', async function(e) {
                e.preventDefault(); // Prevent the default form submission
                if (objectNameInput.value === '') {
                    alert("Entrez un nom d'objet"); // Alert if the input is empty
                } else {
                    showLoading();
                    await uploadFiles();
                    setTimeout(() => {
                            document.getElementById('loader').style.display = 'none';
                            document.getElementById('loading-text').style.display = 'none';
                            document.getElementById('ending-text').style.display = 'flex';
                            setTimeout(() => {
                                hideLoading();
                            }, 2000); // Hide after 2 seconds, for example
                        }, 1000); // Delay of 2000 milliseconds (2 seconds)
                    }
                });
            });

            function showLoading() {
            console.log('SHOW LOADING');
            document.getElementById('upload-form').style.display = 'none';
            document.querySelector('.loading-container').style.display = 'flex';
            document.getElementById('loader').style.display = 'flex';
            document.getElementById('loading-text').style.display = 'flex';
            document.getElementById('ending-text').style.display = 'none';
        }

        function hideLoading() {
            document.getElementById('upload-form').style.display = 'block';
            document.querySelector('.loading-container').style.display = 'none';
        }

    </script>
</body> 
</html>