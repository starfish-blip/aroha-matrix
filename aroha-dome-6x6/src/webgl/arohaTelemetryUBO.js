export const AROHA_UBO_BINDING_POINT = 0;
export const AROHA_UBO_BYTE_LENGTH = 64;

export class ArohaTelemetryUBO {
  constructor(gl, bindingPoint = AROHA_UBO_BINDING_POINT) {
    if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
      throw new Error("ArohaTelemetryUBO requires a WebGL2RenderingContext.");
    }
    this.gl = gl;
    this.bindingPoint = bindingPoint;
    this.data = new Float32Array(16);

    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferData(gl.UNIFORM_BUFFER, AROHA_UBO_BYTE_LENGTH, gl.DYNAMIC_DRAW);
    gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bindingPoint, this.buffer);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  attachProgram(program, blockName = "ArohaTelemetryBlock") {
    const { gl } = this;
    const blockIndex = gl.getUniformBlockIndex(program, blockName);
    if (blockIndex === gl.INVALID_INDEX) {
      throw new Error(`Uniform block "${blockName}" not found in shader.`);
    }
    const gpuByteSize = gl.getActiveUniformBlockParameter(
      program,
      blockIndex,
      gl.UNIFORM_BLOCK_DATA_SIZE
    );
    if (gpuByteSize !== AROHA_UBO_BYTE_LENGTH) {
      throw new Error(
        `std140 size mismatch: GPU expects ${gpuByteSize} bytes, CPU buffer is ${AROHA_UBO_BYTE_LENGTH} bytes.`
      );
    }
    gl.uniformBlockBinding(program, blockIndex, this.bindingPoint);
    return gpuByteSize;
  }

  updateFromSnapshot(snapshot, timeSec, width, height, ptrX = 0.0, ptrY = 0.0) {
    const s = snapshot.states;
    const m = snapshot.metrics;
    const d = this.data;

    d[0] = s.S3_Terra;
    d[1] = s.S2_Bridge;
    d[2] = s.S25_Handshake;
    d[3] = snapshot.x;

    d[4] = s.E26_Red;
    d[5] = s.E26_Green;
    d[6] = s.E26_Blue;
    d[7] = m.r_zenith;

    d[8]  = m.coherence_c26;
    d[9]  = snapshot.j0;
    d[10] = timeSec;
    d[11] = snapshot.gate_action === "confirm" ? 1.0 : snapshot.gate_action === "reject" ? -1.0 : 0.0;

    d[12] = width;
    d[13] = height;
    d[14] = ptrX;
    d[15] = ptrY;

    const { gl } = this;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, d);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  uploadRawBuffer(float32OrArrayBuffer) {
    const view =
      float32OrArrayBuffer instanceof Float32Array
        ? float32OrArrayBuffer
        : new Float32Array(float32OrArrayBuffer);
    if (view.byteLength !== AROHA_UBO_BYTE_LENGTH) {
      throw new RangeError(`Expected 64 bytes, received ${view.byteLength} bytes.`);
    }
    this.data.set(view);
    const { gl } = this;
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }

  dispose() {
    this.gl.deleteBuffer(this.buffer);
  }
}

export function createThreeArohaUniformsGroup(THREE) {
  const group = new THREE.UniformsGroup();
  group.setName("ArohaTelemetryBlock");
  group.setUsage(THREE.DynamicDrawUsage);

  const uZoneLower   = new THREE.Uniform(new THREE.Vector4(1, 0, 0, 0));
  const uPoint26Rgb  = new THREE.Uniform(new THREE.Vector4(0, 0, 0, 0));
  const uDomeMetrics = new THREE.Uniform(new THREE.Vector4(0, 1, 0, 0));
  const uViewport    = new THREE.Uniform(new THREE.Vector4(1920, 1080, 0, 0));

  group.add(uZoneLower);
  group.add(uPoint26Rgb);
  group.add(uDomeMetrics);
  group.add(uViewport);

  return { group, uZoneLower, uPoint26Rgb, uDomeMetrics, uViewport };
}
