import { useState, useEffect, useRef } from "react";
import "./InfoTip.css";

interface Props {
    children: React.ReactNode;
}

const InfoTip = ({ children }: Props) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
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
                className={`infotip-btn${open ? " active" : ""}`}
                onClick={() => setOpen(v => !v)}
                aria-label="More information"
            >
                i
            </button>
            {open && (
                <div className="infotip-popover">
                    {children}
                </div>
            )}
        </div>
    );
};

export default InfoTip;
