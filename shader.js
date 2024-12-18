

// Vertex shader
const vertexShaderSource = `#version 300 es
in vec3 inVertex;
in vec3 inNormal;

out vec3 worldNormal;
out vec3 worldPosition;

uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 normalMatrix;

void main() {
    worldNormal = normalize(mat3(normalMatrix) * inNormal);
    
    vec4 vertex = modelMatrix * vec4(inVertex, 1.0);
    vertex /= vertex.w;

    worldPosition = vertex.xyz;
    gl_Position = projectionMatrix * vertex;
}`;


// Fragment shader
const fragmentShaderSource = `#version 300 es
precision highp float;
    
out vec4 outColor;   

uniform vec3 color;
uniform vec3 lightLocation;

in vec3 worldNormal;
in vec3 worldPosition;

void main() {
    const float ambientFactor = 0.2;

    vec3 N = worldNormal;
    vec3 L = normalize(worldPosition - lightLocation);
    vec3 V = normalize(-worldPosition); 

    if( dot(N, V) < 0.0) {
        N = -N;
    }

    vec3 ambient = color * ambientFactor;
    vec3 diffuse = vec3(max(dot(N, -L), 0.0)) * color * (1.0 - ambientFactor);
    vec3 R = reflect(L, N);
    vec3 specular = vec3(0.6) * pow(max(dot(V, R), 0.0), 8.0);

    outColor = vec4(ambient + diffuse + specular, 1.0);
}`;