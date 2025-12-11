import { useEffect, useRef } from 'react';

export function usePreventSwipe(isModalOpen: boolean) {
  const startX = useRef(0);
  const startY = useRef(0);

  useEffect(() => {
    if (isModalOpen) {
      const handleTouchStart = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          startX.current = e.touches[0].clientX;
          startY.current = e.touches[0].clientY;
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const deltaX = e.touches[0].clientX - startX.current;
          const deltaY = e.touches[0].clientY - startY.current;
          
          // If horizontal movement is greater than vertical, it's a swipe gesture
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            // Check if started from edge (browser back/forward gesture zones)
            if (startX.current < 50 || startX.current > window.innerWidth - 50) {
              e.preventDefault();
            }
          }
        }
      };

      // Prevent overscroll behavior
      document.body.style.overscrollBehaviorX = 'none';
      document.documentElement.style.overscrollBehaviorX = 'none';
      
      document.addEventListener('touchstart', handleTouchStart, { passive: true });
      document.addEventListener('touchmove', handleTouchMove, { passive: false });

      return () => {
        document.body.style.overscrollBehaviorX = '';
        document.documentElement.style.overscrollBehaviorX = '';
        document.removeEventListener('touchstart', handleTouchStart);
        document.removeEventListener('touchmove', handleTouchMove);
      };
    }
  }, [isModalOpen]);
}
