import { useEffect } from 'react';

export function usePreventSwipe(isModalOpen: boolean) {
  useEffect(() => {
    if (isModalOpen) {
      const preventSwipe = (e: TouchEvent) => {
        if (e.touches.length === 1) {
          const touch = e.touches[0];
          const startX = touch.clientX;
          
          if (startX < 30 || startX > window.innerWidth - 30) {
            e.preventDefault();
          }
        }
      };
      
      document.body.style.overscrollBehavior = 'none';
      document.addEventListener('touchstart', preventSwipe, { passive: false });
      
      return () => {
        document.body.style.overscrollBehavior = '';
        document.removeEventListener('touchstart', preventSwipe);
      };
    }
  }, [isModalOpen]);
}
