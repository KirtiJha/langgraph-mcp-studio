import { useState, useEffect, useRef, useCallback } from "react";

interface ContainerDimensions {
  width: number;
  height: number;
}

export const useContainerDimensions = (): [
  React.RefObject<HTMLDivElement>,
  ContainerDimensions
] => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<ContainerDimensions>({
    width: 0,
    height: 0,
  });

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { offsetWidth, offsetHeight } = containerRef.current;
      setDimensions({
        width: offsetWidth,
        height: offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    updateDimensions();

    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateDimensions]);

  useEffect(() => {
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [updateDimensions]);

  return [containerRef as React.RefObject<HTMLDivElement>, dimensions];
};
