import { useState, useEffect, useRef } from "react";
import "./InfoTip.css";

interface Props {
    children: React.ReactNode;
}

const POPOVER_WIDTH = 260;
const SCREEN_MARGIN = 12;

const InfoTip = ({ children }: Props) => {
    const [open, setOpen] = useState(false);
    const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
    const ref = useRef<HTMLDivElement>(null);
    const btnRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect();
            const centeredLeft = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
            const clampedLeft = Math.max(
                SCREEN_MARGIN,
                Math.min(centeredLeft, window.innerWidth - POPOVER_WIDTH - SCREEN_MARGIN)
            );
            setPopoverStyle({ top: rect.bottom + 8, left: clampedLeft });
        }

        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    return (
        <div className="infotip" ref={ref}>
            <button
                ref={btnRef}
                className={`infotip-btn${open ? " active" : ""}`}
                onClick={() => setOpen(v => !v)}
                aria-label="More information"
            >
                i
            </button>
            {open && (
                <div className="infotip-popover" style={popoverStyle}>
                    {children}
                </div>
            )}
        </div>
    );
};

export default InfoTip;
