import { useState, useRef, useEffect, useCallback } from 'react';
import FallingText from './FallingText';
import './NavLinkFalling.css';

interface NavLinkFallingProps {
  text: string;
  href: string;
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
}

const NavLinkFalling: React.FC<NavLinkFallingProps> = ({ text, href, active = false, onClick }) => {
  const [hasFallen, setHasFallen] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [fallPosition, setFallPosition] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [shouldRenderFalling, setShouldRenderFalling] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  // DIAGNOSTIC: Track renders and state
  console.log(`[NavLinkFalling] RENDER "${text}"`, { hasFallen, isRemoved, shouldRenderFalling, fallPosition: !!fallPosition });

  // DIAGNOSTIC: Track when hasFallen changes
  useEffect(() => {
    if (hasFallen) {
      console.log(`[NavLinkFalling] "${text}" hasFallen changed to TRUE`);
      console.trace(`[NavLinkFalling] Stack trace for "${text}" hasFallen=true`);
    }
  }, [hasFallen, text]);

  // DIAGNOSTIC: Track when shouldRenderFalling changes
  useEffect(() => {
    if (shouldRenderFalling) {
      console.log(`[NavLinkFalling] "${text}" shouldRenderFalling changed to TRUE - FallingText will mount`);
    }
  }, [shouldRenderFalling, text]);

  // Memoize onComplete to prevent FallingText useEffect from re-running on parent re-renders
  const handleFallingComplete = useCallback(() => {
    setIsRemoved(true);
  }, []);

  // Exclude "Home" from falling animation - it should remain functional
  const isHome = text.toLowerCase() === 'home';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // DIAGNOSTIC: Log every click on nav links
    console.log(`[NavLinkFalling] Click on "${text}"`, {
      target: e.target,
      currentTarget: e.currentTarget,
      eventPhase: e.eventPhase, // 1=capture, 2=target, 3=bubble
      isTrusted: e.isTrusted, // false if synthetic/programmatic
      timeStamp: e.timeStamp,
      clientX: e.clientX,
      clientY: e.clientY,
    });
    console.trace(`[NavLinkFalling] Stack trace for "${text}" click`);

    // If it's Home, don't do the falling animation
    if (isHome) {
      return; // Let the default link behavior handle it
    }

    if (!hasFallen && !isRemoved) {
      e.preventDefault();
      // Use the clicked element directly to get accurate position
      const target = e.currentTarget;
      const rect = target.getBoundingClientRect();
      // Make container full viewport size so text can fall through entire screen
      // Store the nav link position so we can position text there initially
      // Use the center of the nav link for positioning
      const navLinkCenterX = rect.left + rect.width / 2;
      const navLinkTop = rect.top;
      setFallPosition({
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
        navLinkTop: navLinkTop,
        navLinkLeft: navLinkCenterX
      } as any);
      setHasFallen(true);
      // Small delay to ensure container is rendered and DOM is updated
      setTimeout(() => {
        setShouldRenderFalling(true);
      }, 50);
      // Handle navigation after animation starts
      if (href !== '#') {
        setTimeout(() => {
          if (onClick) {
            onClick(e);
          } else {
            window.location.href = href;
          }
        }, 300);
      }
    }
  };

  // If it's Home, just render a regular link without falling animation
  if (isHome) {
    return (
      <a
        href={href}
        className={`nav-link ${active ? 'active' : ''}`}
        onClick={onClick}
      >
        {text}
      </a>
    );
  }

  if (isRemoved) {
    return null;
  }

  if (hasFallen && fallPosition) {
    return (
      <>
        <a
          ref={linkRef}
          href={href}
          className={`nav-link ${active ? 'active' : ''}`}
          style={{ visibility: 'hidden', pointerEvents: 'none' }}
        >
          {text}
        </a>
        {shouldRenderFalling && (
          <div 
            className={`nav-link-falling ${active ? 'active' : ''}`}
            style={{
              position: 'fixed',
              top: `${fallPosition.top}px`,
              left: `${fallPosition.left}px`,
              width: `${fallPosition.width}px`,
              height: `${fallPosition.height}px`,
              zIndex: 9999,
              overflow: 'visible'
            }}
          >
            <FallingText
              text={text}
              trigger="auto"
              backgroundColor="transparent"
              wireframes={false}
              gravity={0.8}
              fontSize="15px"
              mouseConstraintStiffness={0.2}
              noBoundaries={true}
              initialX={(fallPosition as any).navLinkLeft || 0}
              initialY={(fallPosition as any).navLinkTop || 0}
              onComplete={handleFallingComplete}
            />
          </div>
        )}
      </>
    );
  }

  return (
    <a
      ref={linkRef}
      href={href}
      className={`nav-link ${active ? 'active' : ''}`}
      onClick={handleClick}
    >
      {text}
    </a>
  );
};

export default NavLinkFalling;
