"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import {
    Rive,
    Layout,
    EventType,
    Fit,
    Alignment,
} from '@rive-app/react-canvas';

enum PlayerState {
    Idle,
    Loading,
    Active,
    Error,
}

enum PlayerError {
    NoAnimation,
}

type Status = {
    current: PlayerState;
    hovering?: boolean;
    error?: PlayerError | null;
};

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [status, setStatus] = useState<Status>({ current: PlayerState.Idle, hovering: false });
    const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    
    useEffect(() => {
        riveAnimation?.on(EventType.Load, () => {
            // stuff on successful load
            setStatus({ current: PlayerState.Active, error: null });
        });
        riveAnimation?.on(EventType.LoadError, () => setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation }));
        riveAnimation?.on(EventType.Play, () => setIsPlaying(true));
        riveAnimation?.on(EventType.Pause, () => setIsPlaying(false));
        riveAnimation?.on(EventType.Stop, () => setIsPlaying(false));
            
    }, [riveAnimation]);

    const setAnimationWithBuffer = (buffer: string | ArrayBuffer | null) => {
        if (!buffer) return;
        
        setStatus({ current: PlayerState.Loading });

        if (riveAnimation) {
            riveAnimation.load({
                buffer: buffer as ArrayBuffer,
                autoplay: true,
            });
            return;
        }

        try {
            setRiveAnimation(new Rive({
                buffer: buffer as ArrayBuffer,
                canvas: canvasRef.current as HTMLCanvasElement,
                autoplay: true,
                layout: new Layout({
                    fit: Fit.Cover,
                    alignment: Alignment.Center,
                }),
            }));
            setStatus({ current: PlayerState.Active });
        } catch (e) {
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
        }
    };

    return (
        <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
            <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
                <ol className="list-inside list-decimal text-sm text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
                    <li className="mb-2">
                    Get started by editing{" "}
                        <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                        app/page.tsx
                    </code>
                    .
                </li>
                    <li>Save and see your changes instantly.</li>
                </ol>
            </main>
            </div>
    );
}
