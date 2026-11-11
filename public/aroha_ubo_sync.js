export class AROHAUBOSync {
  constructor(gl, program, blockName = 'TelemetryBlock', bindingPoint = 0) {
    this.gl = gl;
    this.program = program;
    this.bindingPoint = bindingPoint;
    // 12 floats = 48 bytes (3 x vec4 std140 aligned blocks)
    this.data = new Float32Array(12);
    this.buffer = gl.createBuffer();
    this.blockIndex = gl.getUniformBlockIndex(program, blockName);

    if (this.blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(program, this.blockIndex, this.bindingPoint);
      gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
      gl.bufferData(gl.UNIFORM_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
      gl.bindBufferBase(gl.UNIFORM_BUFFER, this.bindingPoint, this.buffer);
      gl.bindBuffer(gl.UNIFORM_BUFFER, null);
    } else {
      console.warn(`[AROHA UBO] Block ${blockName} not found in shader.`);
    }
  }

  update(state, elapsedTime) {
    const gl = this.gl;
    this.data[0] = state.thermal_temp ?? 36.6;
    this.data[1] = state.chladni_freq ?? 432.0;
    this.data[2] = elapsedTime;
    this.data[3] = state.binaural_delta ?? 7.83;

    this.data[4] = state.lunar_illumination ?? 0.5;
    this.data[5] = state.lunar_energy ?? 0.5;
    this.data[6] = state.thermal_freq ?? 261.63;
    this.data[7] = state.lunar_day ?? 16.0;

    this.data[8] = state.fft_sub ?? 0.0;
    this.data[9] = state.fft_mid ?? 0.0;
    this.data[10] = state.fft_high ?? 0.0;
    this.data[11] = state.wai_flux ?? 0.0;

    gl.bindBuffer(gl.UNIFORM_BUFFER, this.buffer);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, this.data);
    gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  }
}
