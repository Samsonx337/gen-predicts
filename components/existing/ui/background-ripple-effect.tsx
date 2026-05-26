"use client";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const BackgroundRippleEffect = ({
  rows = 8,
  cols = 27,
  cellSize = 56,
}: {
  rows?: number;
  cols?: number;
  cellSize?: number;
}) => {
  const [clickedCell, setClickedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [rippleKey, setRippleKey] = useState(0);
  const [calculatedCols, setCalculatedCols] = useState(cols);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Calculate columns based on viewport width to cover full width
    const calculateCols = () => {
      if (typeof window !== "undefined") {
        const viewportWidth = window.innerWidth;
        const colsNeeded = Math.ceil(viewportWidth / cellSize) + 1; // +1 to ensure full coverage
        setCalculatedCols(colsNeeded);
      }
    };

    // Use requestAnimationFrame to ensure this runs after initial render
    requestAnimationFrame(() => {
      calculateCols();
    });
    
    window.addEventListener("resize", calculateCols);
    return () => window.removeEventListener("resize", calculateCols);
  }, [cellSize]);

  const containerStyle: React.CSSProperties = {
    margin: 0,
    padding: 0,
    marginTop: '-38px',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: 'calc(100% + 38px)',
    width: '100%',
    position: 'absolute',
  };

  return (
    <div
      ref={ref}
      className={cn(
        "hidden",
        "dark:absolute dark:top-0 dark:left-0 dark:right-0 dark:block dark:w-full",
        "dark:[--cell-border-color:var(--color-neutral-700)] dark:[--cell-fill-color:var(--color-neutral-900)] dark:[--cell-shadow-color:var(--color-neutral-800)]",
      )}
      style={containerStyle}
      suppressHydrationWarning
      aria-hidden="true"
    >
      <div className="relative h-full w-full overflow-hidden" style={{ margin: 0, padding: 0, top: 0, left: 0 }}>
        <div className="pointer-events-none absolute inset-0 z-2 h-full w-full overflow-hidden" />
        <div className="absolute" style={{ margin: 0, padding: 0, top: 0, left: 0 }}>
          <DivGrid
            key={`base-${rippleKey}`}
            className="opacity-60"
            rows={rows}
            cols={calculatedCols}
            cellSize={cellSize}
            borderColor="var(--cell-border-color)"
            fillColor="var(--cell-fill-color)"
            clickedCell={clickedCell}
            onCellClick={(row, col) => {
              setClickedCell({ row, col });
              setRippleKey((k) => k + 1);
            }}
            interactive
          />
        </div>
      </div>
    </div>
  );
};

type DivGridProps = {
  className?: string;
  rows: number;
  cols: number;
  cellSize: number; // in pixels
  borderColor: string;
  fillColor: string;
  clickedCell: { row: number; col: number } | null;
  onCellClick?: (row: number, col: number) => void;
  interactive?: boolean;
};

type CellStyle = React.CSSProperties & {
  ["--delay"]?: string;
  ["--duration"]?: string;
};

const DivGrid = ({
  className,
  rows = 7,
  cols = 30,
  cellSize = 56,
  borderColor = "#3f3f46",
  fillColor = "rgba(14,165,233,0.3)",
  clickedCell = null,
  onCellClick = () => {},
  interactive = true,
}: DivGridProps) => {
  const cells = useMemo(
    () => Array.from({ length: rows * cols }, (_, idx) => idx),
    [rows, cols],
  );

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
    gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
    width: `${cols * cellSize}px`,
    height: rows * cellSize,
  };

  return (
    <div className={cn("relative z-3", className)} style={gridStyle}>
      {cells.map((idx) => {
        const rowIdx = Math.floor(idx / cols);
        const colIdx = idx % cols;
        const distance = clickedCell
          ? Math.hypot(clickedCell.row - rowIdx, clickedCell.col - colIdx)
          : 0;
        const delay = clickedCell ? Math.max(0, distance * 55) : 0; // ms
        const duration = 200 + distance * 80; // ms

        const style: CellStyle = clickedCell
          ? {
              "--delay": `${delay}ms`,
              "--duration": `${duration}ms`,
            }
          : {};

        return (
          <div
            key={idx}
            className={cn(
              "cell relative border-[0.5px] opacity-40 transition-opacity duration-150 will-change-transform hover:opacity-80 dark:shadow-[0px_0px_40px_1px_var(--cell-shadow-color)_inset]",
              clickedCell && "animate-cell-ripple [animation-fill-mode:none]",
              !interactive && "pointer-events-none",
            )}
            style={{
              backgroundColor: fillColor,
              borderColor: borderColor,
              ...style,
            }}
            onClick={
              interactive ? () => onCellClick?.(rowIdx, colIdx) : undefined
            }
          />
        );
      })}
    </div>
  );
};

