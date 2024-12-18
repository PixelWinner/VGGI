function normalizeUV(value, min, max) {
    return (value - min) / (max - min);
}

function calculateFacetNormal(v1, v2, v3) {
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    const normal = [
        edge1[1] * edge2[2] - edge1[2] * edge2[1],
        edge1[2] * edge2[0] - edge1[0] * edge2[2],
        edge1[0] * edge2[1] - edge1[1] * edge2[0]
    ];

    return m4.normalize(normal, [0, 1, 0]);
}

function calculateTangent(v1, v2, v3, uv1, uv2, uv3) {
    const edge1 = [v2[0] - v1[0], v2[1] - v1[1], v2[2] - v1[2]];
    const edge2 = [v3[0] - v1[0], v3[1] - v1[1], v3[2] - v1[2]];

    const deltaUV1 = [uv2[0] - uv1[0], uv2[1] - uv1[1]];
    const deltaUV2 = [uv3[0] - uv1[0], uv3[1] - uv1[1]];

    const r = 1.0 / (deltaUV1[0] * deltaUV2[1] - deltaUV1[1] * deltaUV2[0]);

    const tangent = [
        r * (deltaUV2[1] * edge1[0] - deltaUV1[1] * edge2[0]),
        r * (deltaUV2[1] * edge1[1] - deltaUV1[1] * edge2[1]),
        r * (deltaUV2[1] * edge1[2] - deltaUV1[1] * edge2[2])
    ];

    return m4.normalize(tangent, [1, 0, 0]);
}

function calculateNormalsAndTangents(vertices, uvs, indices) {
    const vertexNormals = new Float32Array(vertices.length).fill(0);
    const vertexTangents = new Float32Array(vertices.length).fill(0);

    const facetNormals = [];
    const facetTangents = [];

    for (let i = 0; i < indices.length; i += 3) {
        const idx1 = indices[i];
        const idx2 = indices[i + 1];
        const idx3 = indices[i + 2];

        const v1 = vertices.slice(idx1 * 3, idx1 * 3 + 3);
        const v2 = vertices.slice(idx2 * 3, idx2 * 3 + 3);
        const v3 = vertices.slice(idx3 * 3, idx3 * 3 + 3);
        
        const facetNormal = calculateFacetNormal(v1, v2, v3);
        facetNormals.push({ normal: facetNormal, indices: [indices[i], indices[i + 1], indices[i + 2]] });

        const uv1 = uvs.slice(idx1 * 2, idx1 * 2 + 2);
        const uv2 = uvs.slice(idx2 * 2, idx2 * 2 + 2);
        const uv3 = uvs.slice(idx3 * 2, idx3 * 2 + 2);

        const facetTangent = calculateTangent(v1, v2, v3, uv1, uv2, uv3);
        facetTangents.push({ tangent: facetTangent, indices: [indices[i], indices[i + 1], indices[i + 2]] });
    }

    facetNormals.forEach(facet => {
        const { normal, indices } = facet;

        indices.forEach(idx => {
            const baseIndex = idx * 3;
            
            vertexNormals[baseIndex] += normal[0];
            vertexNormals[baseIndex + 1] += normal[1];
            vertexNormals[baseIndex + 2] += normal[2];
        });
    });

    facetTangents.forEach(facet => {
        const { tangent, indices } = facet;
        indices.forEach(idx => {
            const baseIndex = idx * 3;
            
            vertexTangents[baseIndex] += tangent[0];
            vertexTangents[baseIndex + 1] += tangent[1];
            vertexTangents[baseIndex + 2] += tangent[2];
        });
    });

    for (let i = 0; i < vertexNormals.length; i += 3) {
        const length = Math.sqrt(
            vertexNormals[i] * vertexNormals[i] +
            vertexNormals[i + 1] * vertexNormals[i + 1] +
            vertexNormals[i + 2] * vertexNormals[i + 2]
        );
        vertexNormals[i] /= length;
        vertexNormals[i + 1] /= length;
        vertexNormals[i + 2] /= length;
    }

    for (let i = 0; i < vertexTangents.length; i += 3) {
        const tangentLength = Math.sqrt(
            vertexTangents[i] * vertexTangents[i] +
            vertexTangents[i + 1] * vertexTangents[i + 1] +
            vertexTangents[i + 2] * vertexTangents[i + 2]
        );
        vertexTangents[i] /= tangentLength;
        vertexTangents[i + 1] /= tangentLength;
        vertexTangents[i + 2] /= tangentLength;
    }

    return {vertexNormals, vertexTangents};
}

function generateSievertSurface(C, uSteps, vSteps) {
    const vertices = [];
    const indices = [];
    const uvs = [];

    for (let i = 0; i <= uSteps; i++) {
        let u = ((i / uSteps) - 0.5) * Math.PI; // u in range [-π/2, π/2]
        
        for (let j = 0; j <= vSteps; j++) {
            const rangeOffset = 0.1;
            let v = rangeOffset + (j / vSteps) * (Math.PI - rangeOffset * 2.0); // v in range [rangeOffset, π - rangeOffset]. 

            // Calculate ϕ
            let phi = -u / Math.sqrt(C + 1) + Math.atan(Math.tan(u) * Math.sqrt(C + 1));

            // Calculate a and r
            let a = 2 / (C + 1 - C * Math.sin(v) ** 2 * Math.cos(u));
            let r = (a * Math.sqrt((C + 1) * (1 + C * Math.sin(u) ** 2)) * Math.sin(v)) / Math.sqrt(C);

            // Parametric equations
            let x = r * Math.cos(phi) - 2;
            let y = r * Math.sin(phi);
            let z = (Math.log(Math.tan(v / 2)) + a * (C + 1) * Math.cos(v)) / Math.sqrt(C);
            
            vertices.push(x, y, z);
            uvs.push(normalizeUV(u, -Math.PI / 2.0, Math.PI / 2.0), normalizeUV(v, 0.0, Math.PI));
        }
    }

    for (let i = 0; i < uSteps; i++) {
        for (let j = 0; j < vSteps; j++) {
            const topLeft = i * (vSteps + 1) + j;
            const topRight = i * (vSteps + 1) + (j + 1);
            const bottomLeft = (i + 1) * (vSteps + 1) + j;
            const bottomRight = (i + 1) * (vSteps + 1) + (j + 1);

            indices.push(topLeft, bottomLeft, bottomRight);
            indices.push(topLeft, bottomRight, topRight);
        }
    }

    return { vertices, indices, uvs };
}

export default function Model(gl, shProgram) {
    this.iVertexBuffer = gl.createBuffer();
    this.iNormalBuffer = gl.createBuffer();
    this.iTangentBuffer = gl.createBuffer();
    this.iUVBuffer = gl.createBuffer();
    this.iIndexBuffer = gl.createBuffer();

    this.idTextureDiffuse = LoadTexture(gl, "./textures/diffuse.jpg");
    this.idTextureNormal = LoadTexture(gl, "./textures/normal.jpg");
    this.idTextureSpecular = LoadTexture(gl, "./textures/specular.jpg");

    this.count = 0;

    this.BufferData = function(vertices, normals, tangents, uvs, indices) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, tangents, gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        this.count = indices.length;
    };

    this.Draw = function() {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iNormalBuffer);
        gl.vertexAttribPointer(shProgram.iAttribNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTangentBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTangent, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTangent);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iUVBuffer);
        gl.vertexAttribPointer(shProgram.iAttribUV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribUV);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureDiffuse);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureNormal);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.idTextureSpecular);

        gl.drawElements(gl.TRIANGLES, this.count, gl.UNSIGNED_SHORT, 0);
    }

    this.CreateSurfaceData = function() {
        function get(name) {
            return document.getElementById(name).value;
        }

        const C = parseFloat(get('C'));

        const { vertices, indices, uvs } = generateSievertSurface(C, 250, 250);
        const {vertexNormals, vertexTangents} = calculateNormalsAndTangents(vertices, uvs, indices);
        this.BufferData(vertices, vertexNormals, vertexTangents, uvs, indices);
    }
}
