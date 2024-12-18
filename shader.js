

// Vertex shader
const vertexShaderSource = `#version 300 es
in vec3 inVertex;
in vec3 inNormal;
in vec3 inTangent;
in vec2 inUV;

out vec3 worldPosition;
out vec3 worldNormal;
out vec3 worldTangent;
out vec2 UV;

uniform mat4 projectionMatrix;
uniform mat4 modelMatrix;
uniform mat4 normalMatrix;

void main() {
    worldNormal = normalize(mat3(normalMatrix) * inNormal);
    worldTangent = normalize(mat3(normalMatrix) * inTangent);

    UV = inUV;

    vec4 vertex = modelMatrix * vec4(inVertex, 1.0);
    vertex /= vertex.w;

    worldPosition = vertex.xyz;
    gl_Position = projectionMatrix * vertex;
}`;


// Fragment shader
const fragmentShaderSource = `#version 300 es
precision highp float;
    
out vec4 outColor;   

in vec3 worldPosition;
in vec3 worldNormal;
in vec3 worldTangent;
in vec2 UV;

uniform vec3 lightLocation;

uniform sampler2D diffuseTexture;
uniform sampler2D normalTexture;
uniform sampler2D specularTexture;

vec3 calculateNormal()
{
    vec3 normal = worldNormal;
    vec3 tangent = worldTangent;

    normal = normalize(normal - dot(tangent, normal) * tangent);

    vec3 bitangent = cross(tangent, normal);
    vec3 normalMap = texture(normalTexture, UV).rgb;
    normalMap = 2.0 * normalMap - vec3(1.0, 1.0, 1.0);

    mat3 TBN = mat3(tangent, bitangent, normal);
    return normalize(TBN * normalMap);
}

void main() {
    const float ambientFactor = 0.2;
    vec3 color = texture(diffuseTexture, UV).rgb;
    float specularFactor = pow(texture(specularTexture, UV).r, 2.0);

    vec3 N = calculateNormal();
    vec3 L = normalize(worldPosition - lightLocation);
    vec3 V = normalize(-worldPosition); 

    if( dot(N, V) < 0.0) {
        N = -N;
    }

    vec3 ambient = color * ambientFactor;
    vec3 diffuse = vec3(max(dot(N, -L), 0.0)) * color * (1.0 - ambientFactor);
    vec3 R = reflect(L, N);
    vec3 specular = vec3(specularFactor) * pow(max(dot(V, R), 0.0), 8.0);

    outColor = vec4(ambient + diffuse + specular, 1.0);
}`;