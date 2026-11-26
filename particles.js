window.createParticleStage = stage => {
  let canvas = stage.querySelector('canvas');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(pointer: coarse)');
  const particleCount = coarsePointer.matches ? 38000 : 76000;

  const vertexSource = `
    attribute vec3 aPosition;
    attribute float aSeed;
    uniform vec2 uScale, uCenter, uPointer, uPulse, uTilt;
    uniform float uTime, uDensity, uIntro, uHover, uPulseAge;
    varying vec4 vColor;

    void main() {
      vec3 p = aPosition;
      float yaw = uTime * 0.105 + uTilt.x * 0.22;
      float pitch = uTilt.y * 0.19;
      p.xz = mat2(cos(yaw), -sin(yaw), sin(yaw), cos(yaw)) * p.xz;
      p.yz = mat2(cos(pitch), -sin(pitch), sin(pitch), cos(pitch)) * p.yz;
      float perspective = 1.0 / (1.0 - p.z * 0.15);
      vec2 point = p.xy * perspective * 0.989;
      float breath = 1.0 + 0.003 * sin(uTime * 1.5 + p.y * 3.0);
      point *= breath;

      vec2 delta = point - uPointer;
      float distanceToPointer = length(delta);
      float influence = uHover * exp(-distanceToPointer * distanceToPointer * 7.4);
      vec2 sideways = vec2(-delta.y, delta.x);
      point += (delta * 0.54 + sideways * 0.33 + vec2(0.012, 0.025) * sin(p.z * 7.0 + uTime * 2.8)) * influence;

      vec2 waveDelta = point - uPulse;
      float waveDistance = length(waveDelta);
      float waveOffset = waveDistance - uPulseAge * 1.25;
      float wave = exp(-waveOffset * waveOffset * 80.0 - uPulseAge * 1.6);
      point += waveDelta / max(waveDistance, 0.04) * wave * 0.055;

      float arrival = smoothstep(aSeed * 0.28, 0.70 + aSeed * 0.30, uIntro);
      point *= mix(1.22 + aSeed * 0.40, 1.0, arrival);
      gl_Position = vec4(uCenter + point * uScale, 0.0, 1.0);
      float star = pow(aSeed, 3.3);
      gl_PointSize = max(1.0, (0.84 + star * 2.18) * uDensity * perspective * (1.0 + influence * 0.24));

      float light = clamp(0.58 + p.z * 0.23 + p.y * 0.21 - p.x * 0.10, 0.15, 1.0);
      float flicker = 0.89 + 0.11 * sin(uTime * (0.9 + aSeed) + aSeed * 72.0);
      float opacity = (0.25 + 1.05 * star) * light * flicker;
      opacity = min(1.0, opacity + influence * (0.10 + 0.18 * star) + wave * 0.27);
      vec3 tint = mix(vec3(1.0, 0.95, 0.86), vec3(1.0, 0.53, 0.26),
                      min(0.9, influence * 0.75 + wave * 0.75));
      vColor = vec4(tint, opacity * arrival);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      float radius = length(gl_PointCoord - 0.5) * 2.0;
      float coverage = 1.0 - smoothstep(0.23, 1.0, radius);
      gl_FragColor = vec4(vColor.rgb, vColor.a * coverage);
    }
  `;

  function makeParticles(count) {
    const particles = new Float32Array(count * 4);
    for (let i = 0; i < particles.length; i += 4) {
      // Uniformly sample the sphere, with a few points inside the shell.
      const y = Math.random() * 2 - 1;
      const angle = Math.random() * 2 * Math.PI;
      const ring = Math.sqrt(1 - y * y);
      const depth = Math.random();
      const radius = depth < 0.08 ? Math.cbrt(depth / 0.08) : 0.968 + Math.random() * 0.032;
      particles[i] = radius * ring * Math.cos(angle);
      particles[i + 1] = radius * y;
      particles[i + 2] = radius * ring * Math.sin(angle);
      particles[i + 3] = Math.random();
    }
    return particles;
  }

  function makeWebGLRenderer(gl) {
    function compile(type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error(gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    const vertex = compile(gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, makeParticles(particleCount), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'aPosition');
    const seed = gl.getAttribLocation(program, 'aSeed');
    gl.enableVertexAttribArray(position);
    gl.enableVertexAttribArray(seed);
    gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 16, 0);
    gl.vertexAttribPointer(seed, 1, gl.FLOAT, false, 16, 12);

    const uniforms = {};
    for (const name of ['Scale', 'Center', 'Pointer', 'Pulse', 'Tilt', 'Time', 'Density', 'Intro', 'Hover', 'PulseAge']) {
      uniforms[name] = gl.getUniformLocation(program, 'u' + name);
    }
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.clearColor(16 / 255, 15 / 255, 14 / 255, 1);

    return (view, frame) => {
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(uniforms.Scale, 2 * view.radius / view.width, 2 * view.radius / view.height);
      gl.uniform2f(uniforms.Center, 0, 1 - 2 * view.centerY / view.height);
      gl.uniform2f(uniforms.Pointer, frame.x, frame.y);
      gl.uniform2f(uniforms.Pulse, frame.pulseX, frame.pulseY);
      gl.uniform2f(uniforms.Tilt, frame.tiltX, frame.tiltY);
      gl.uniform1f(uniforms.Time, frame.time);
      gl.uniform1f(uniforms.Density, view.density);
      gl.uniform1f(uniforms.Intro, frame.intro);
      gl.uniform1f(uniforms.Hover, frame.hover);
      gl.uniform1f(uniforms.PulseAge, frame.pulseAge);
      gl.drawArrays(gl.POINTS, 0, particleCount);
    };
  }

  function makeCanvasRenderer(context) {
    const points = makeParticles(9300);
    return (view, frame) => {
      context.setTransform(view.density, 0, 0, view.density, 0, 0);
      context.clearRect(0, 0, view.width, view.height);
      const yaw = frame.time * 0.105 + frame.tiltX * 0.22;
      const cosine = Math.cos(yaw);
      const sine = Math.sin(yaw);
      context.fillStyle = '#ffe9d5';
      for (let i = 0; i < points.length; i += 4) {
        const x = points[i] * cosine + points[i + 2] * sine;
        const z = points[i + 2] * cosine - points[i] * sine;
        const perspective = 1 / (1 - z * 0.15);
        const seed = points[i + 3];
        const arrival = Math.max(0, Math.min(1, (frame.intro - seed * 0.28) / 0.72));
        const px = x * perspective;
        const py = points[i + 1] * perspective;
        const dx = px - frame.x;
        const dy = py - frame.y;
        const push = Math.exp(-(dx * dx + dy * dy) * 7.4) * frame.hover;
        const wx = px - frame.pulseX;
        const wy = py - frame.pulseY;
        const distance = Math.hypot(wx, wy);
        const offset = distance - frame.pulseAge * 1.25;
        const wave = Math.exp(-offset * offset * 80 - frame.pulseAge * 1.6);
        const drift = 1 + (1 - arrival) * (0.22 + seed * 0.40);
        const pointX = (px + (dx * 0.54 - dy * 0.33) * push + wx / Math.max(distance, 0.04) * wave * 0.055) * drift;
        const pointY = (py + (dy * 0.54 + dx * 0.33) * push + wy / Math.max(distance, 0.04) * wave * 0.055) * drift;
        const size = (0.65 + seed ** 3 * 1.65) * perspective;
        context.globalAlpha = Math.min(1, ((0.24 + seed ** 3 * 0.65) * (0.7 + z * 0.22) + push * 0.16 + wave * 0.20) * arrival);
        context.fillRect(view.width / 2 + pointX * view.radius - size / 2,
          view.centerY - pointY * view.radius - size / 2, size, size);
      }
      context.globalAlpha = 1;
    };
  }

  function makeFallbackRenderer() {
    const replacement = canvas.cloneNode();
    canvas.replaceWith(replacement);
    canvas = replacement;
    const context = canvas.getContext('2d');
    return context ? makeCanvasRenderer(context) : () => {};
  }

  let render;
  let gl;
  try {
    gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false });
    render = gl ? makeWebGLRenderer(gl) : makeFallbackRenderer();
  } catch (error) {
    console.warn('WebGL unavailable. Switching to Canvas 2D.', error);
    gl = null;
    render = makeFallbackRenderer();
  }

  const view = { width: 0, height: 0, density: 1, centerY: 0, radius: 1 };
  const pointer = { x: 0, y: 0, active: false };
  const frame = { x: 0, y: 0, hover: 0, time: 0, tiltX: 0, tiltY: 0, intro: 0, pulseX: 0, pulseY: 0, pulseAge: 4 };
  const openedAt = performance.now();
  let previous = openedAt;
  let contextLost = false;
  let visible = true;
  let animationId = 0;

  function resize() {
    view.width = stage.clientWidth;
    view.height = stage.clientHeight;
    view.density = Math.min(devicePixelRatio || 1, 1.8);
    view.radius = Math.max(1, 0.44 * Math.min(view.width, view.height));
    view.centerY = view.height / 2;
    canvas.width = Math.max(1, Math.round(view.width * view.density));
    canvas.height = Math.max(1, Math.round(view.height * view.density));
  }

  function readPointer(event) {
    const rect = stage.getBoundingClientRect();
    pointer.x = (event.clientX - rect.left - view.width / 2) / view.radius;
    pointer.y = (view.centerY - event.clientY + rect.top) / view.radius;
    pointer.active = true;
  }

  function draw(now) {
    if (contextLost || document.hidden || !visible) return;
    const step = Math.min(0.035, Math.max(0, (now - previous) / 1000));
    previous = now;
    const ease = 1 - Math.exp(-step * 10);
    const motion = reduceMotion.matches ? 0.38 : 1;
    frame.x += (pointer.x - frame.x) * ease;
    frame.y += (pointer.y - frame.y) * ease;
    frame.hover += ((pointer.active ? motion : 0) - frame.hover) * ease;
    const targetX = pointer.active ? Math.max(-1, Math.min(1, pointer.x)) * motion : 0;
    const targetY = pointer.active ? Math.max(-1, Math.min(1, -pointer.y)) * motion : 0;
    frame.tiltX += (targetX - frame.tiltX) * ease * 0.45;
    frame.tiltY += (targetY - frame.tiltY) * ease * 0.45;
    if (!reduceMotion.matches) frame.time += step;
    frame.intro = reduceMotion.matches ? 1 : Math.min(1, Math.max(0, (now - openedAt) / 1450));
    frame.pulseAge = Math.min(4, frame.pulseAge + step);
    render(view, frame);
    animationId = requestAnimationFrame(draw);
  }

  function pulse(x, y) {
    frame.pulseX = x;
    frame.pulseY = y;
    frame.pulseAge = reduceMotion.matches ? 0.55 : 0;
  }

  stage.addEventListener('pointermove', event => {
    if (event.target !== canvas || !event.isPrimary) return;
    readPointer(event);
  });
  stage.addEventListener('pointerleave', () => { pointer.active = false; });
  stage.addEventListener('pointercancel', () => { pointer.active = false; });
  stage.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') pointer.active = false;
  });
  stage.addEventListener('pointerdown', event => {
    if (event.target !== canvas || !event.isPrimary || event.button !== 0) return;
    readPointer(event);
    pulse(pointer.x, pointer.y);
  });
  function syncAnimation() {
    cancelAnimationFrame(animationId);
    if (visible && !document.hidden && !contextLost) {
      previous = performance.now();
      animationId = requestAnimationFrame(draw);
    }
  }

  document.addEventListener('visibilitychange', syncAnimation);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) pointer.active = false;
    syncAnimation();
  }).observe(stage);
  if (gl && canvas === gl.canvas) {
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(animationId);
    });
    canvas.addEventListener('webglcontextrestored', () => {
      try {
        render = makeWebGLRenderer(gl);
      } catch {
        render = makeFallbackRenderer();
        resize();
      }
      contextLost = false;
      syncAnimation();
    });
  }
  new ResizeObserver(resize).observe(stage);
  resize();
  syncAnimation();
};
