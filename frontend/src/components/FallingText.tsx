import { useRef, useState, useEffect } from 'react';
import Matter from 'matter-js';
import './FallingText.css';

interface FallingTextProps {
  text?: string;
  highlightWords?: string[];
  highlightClass?: string;
  trigger?: 'auto' | 'scroll' | 'click' | 'hover';
  backgroundColor?: string;
  wireframes?: boolean;
  gravity?: number;
  mouseConstraintStiffness?: number;
  fontSize?: string;
  noBoundaries?: boolean;
  onComplete?: () => void;
  initialX?: number;
  initialY?: number;
}

const FallingText: React.FC<FallingTextProps> = ({
  text = '',
  highlightWords = [],
  highlightClass = 'highlighted',
  trigger = 'auto',
  backgroundColor = 'transparent',
  wireframes = false,
  gravity = 1,
  mouseConstraintStiffness = 0.2,
  fontSize = '1rem',
  noBoundaries = false,
  onComplete,
  initialX,
  initialY
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);

  const [effectStarted, setEffectStarted] = useState(false);

  useEffect(() => {
    if (!textRef.current) return;
    const words = text.split(' ');
    const newHTML = words
      .map(word => {
        const isHighlighted = highlightWords.some(hw => word.startsWith(hw));
        return `<span class="word ${isHighlighted ? highlightClass : ''}">${word}</span>`;
      })
      .join(' ');
    textRef.current.innerHTML = newHTML;
  }, [text, highlightWords, highlightClass]);

  useEffect(() => {
    if (trigger === 'auto') {
      setEffectStarted(true);
      return;
    }
    if (trigger === 'scroll' && containerRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setEffectStarted(true);
            observer.disconnect();
          }
        },
        { threshold: 0.1 }
      );
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }
  }, [trigger]);

  useEffect(() => {
    if (!effectStarted) return;

    const { Engine, Render, World, Bodies, Runner, Mouse, MouseConstraint } = Matter;

    if (!containerRef.current || !canvasContainerRef.current || !textRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const width = containerRect.width;
    const height = containerRect.height;

    if (width <= 0 || height <= 0) {
      console.warn('FallingText: Container has invalid dimensions', { width, height });
      return;
    }

    const engine = Engine.create();
    engine.world.gravity.y = gravity;

    const render = Render.create({
      element: canvasContainerRef.current,
      engine,
      options: {
        width,
        height,
        background: backgroundColor,
        wireframes
      }
    });

    const boundaryOptions = {
      isStatic: true,
      render: { fillStyle: 'transparent' }
    };
    const boundaries = [];
    if (!noBoundaries) {
      const floor = Bodies.rectangle(width / 2, height + 25, width, 50, boundaryOptions);
      const leftWall = Bodies.rectangle(-25, height / 2, 50, height, boundaryOptions);
      const rightWall = Bodies.rectangle(width + 25, height / 2, 50, height, boundaryOptions);
      const ceiling = Bodies.rectangle(width / 2, -25, width, 50, boundaryOptions);
      boundaries.push(floor, leftWall, rightWall, ceiling);
    }

    const wordSpans = textRef.current.querySelectorAll<HTMLSpanElement>('.word');
    
    // If initialX/Y are provided, position words directly at those coordinates
    // Otherwise, use their current positions
    let startX = 0;
    let startY = 0;
    if (initialX !== undefined && initialY !== undefined && wordSpans.length > 0) {
      // Calculate total text width to center it
      let totalWidth = 0;
      wordSpans.forEach(span => {
        totalWidth += span.getBoundingClientRect().width;
      });
      // Add spacing between words (approximate)
      totalWidth += (wordSpans.length - 1) * 4; // 2px margin on each side
      startX = initialX - totalWidth / 2;
      startY = initialY;
    } else if (wordSpans.length > 0) {
      // Use first word's position as starting point
      const firstRect = wordSpans[0].getBoundingClientRect();
      startX = firstRect.left - containerRect.left;
      startY = firstRect.top - containerRect.top;
    }
    
    // Position words horizontally, starting from startX
    let currentX = startX;
    const wordBodies = Array.from(wordSpans).map((elem) => {
      const rect = elem.getBoundingClientRect();
      const wordWidth = rect.width;
      
      // Position word at currentX, centered vertically at startY
      const x = currentX + wordWidth / 2;
      const y = startY + rect.height / 2;
      
      // Move to next word position
      currentX += wordWidth + 4; // 4px spacing (2px margin each side)

      const body = Bodies.rectangle(x, y, wordWidth, rect.height, {
        render: { fillStyle: 'transparent' },
        restitution: 0.8,
        frictionAir: 0.01,
        friction: 0.2
      });

      Matter.Body.setVelocity(body, {
        x: (Math.random() - 0.5) * 5,
        y: 0
      });
      Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.05);
      return { elem, body };
    });

    wordBodies.forEach(({ elem, body }) => {
      elem.style.position = 'absolute';
      elem.style.left = `${body.position.x - body.bounds.max.x + body.bounds.min.x / 2}px`;
      elem.style.top = `${body.position.y - body.bounds.max.y + body.bounds.min.y / 2}px`;
      elem.style.transform = 'none';
      elem.style.zIndex = '10000';
    });

    const mouse = Mouse.create(containerRef.current);
    const mouseConstraint = MouseConstraint.create(engine, {
      mouse,
      constraint: {
        stiffness: mouseConstraintStiffness,
        render: { visible: false }
      }
    });
    render.mouse = mouse;

    World.add(engine.world, [...boundaries, mouseConstraint, ...wordBodies.map(wb => wb.body)]);

    const runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    let allOffScreen = false;
    const checkOffScreen = () => {
      if (noBoundaries && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const allOff = wordBodies.every(({ body }) => {
          const screenY = containerRect.top + body.position.y;
          return screenY > viewportHeight + 100; // 100px buffer
        });
        if (allOff && !allOffScreen) {
          allOffScreen = true;
          if (onComplete) {
            setTimeout(() => onComplete(), 500);
          }
        }
      }
    };

    const updateLoop = () => {
      wordBodies.forEach(({ body, elem }) => {
        const { x, y } = body.position;
        elem.style.left = `${x}px`;
        elem.style.top = `${y}px`;
        elem.style.transform = `translate(-50%, -50%) rotate(${body.angle}rad)`;
        elem.style.zIndex = '10000';
      });
      Matter.Engine.update(engine);
      checkOffScreen();
      requestAnimationFrame(updateLoop);
    };
    updateLoop();

    return () => {
      Render.stop(render);
      Runner.stop(runner);
      if (render.canvas && canvasContainerRef.current) {
        canvasContainerRef.current.removeChild(render.canvas);
      }
      World.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [effectStarted, gravity, wireframes, backgroundColor, mouseConstraintStiffness, noBoundaries, onComplete]);

  const handleTrigger = () => {
    if (!effectStarted && (trigger === 'click' || trigger === 'hover')) {
      setEffectStarted(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className="falling-text-container"
      onClick={trigger === 'click' ? handleTrigger : undefined}
      onMouseEnter={trigger === 'hover' ? handleTrigger : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <div
        ref={textRef}
        className="falling-text-target"
        style={{
          fontSize: fontSize,
          lineHeight: 1.4
        }}
      />
      <div ref={canvasContainerRef} className="falling-text-canvas" />
    </div>
  );
};

export default FallingText;
