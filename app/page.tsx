"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import { Rive, Layout, EventType, Fit, Alignment, } from '@rive-app/react-canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card"

import { UploadIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';

enum PlayerState {
    Idle,
    Loading,
    Active,
    Error,
}

enum PlayerError {
    NoAnimation,
}

type Dimensions = {
    width: number;
    height: number;
};

type Status = {
    current: PlayerState;
    hovering?: boolean;
    error?: PlayerError | null;
};

export default function Home() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<Status>({ current: PlayerState.Idle, hovering: false });
    const [filename, setFilename] = useState<string | null>(null);
    const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    
    useEffect(() => {
        riveAnimation?.on(EventType.Load, () => {
            // TODO: stuff on successful load
            setStatus({ current: PlayerState.Active, error: null });
        });
        riveAnimation?.on(EventType.LoadError, () => {
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
        });
        riveAnimation?.on(EventType.Play, () => setIsPlaying(true));
        riveAnimation?.on(EventType.Pause, () => setIsPlaying(false));
        riveAnimation?.on(EventType.Stop, () => setIsPlaying(false));
            
    }, [riveAnimation]);

    useEffect(() => {
        if (status.current === PlayerState.Error && status.error !== null) {
            reset();
        } 
        // else if (status.current === PlayerState.Active && !animationList) {
        //     // Try fetching the animations again
        //     getAnimations();
        // }
    }, [status]);

    useEffect(() => {
        if (canvasRef.current && dimensions && riveAnimation) {
            canvasRef.current.width = dimensions.width;
            canvasRef.current.height = dimensions.height;
            riveAnimation.resizeToCanvas();
        }

        if (typeof window !== 'undefined') {
            //  TODO: handle hiding some elements on mobile
            // window.innerWidth < 800 ? console.log('Mobile') : console.log('Desktop');
        }
    }, [dimensions, riveAnimation]);

    useEffect(() => {
        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    const updateDimensions = () => {
        const targetDimensions = previewRef.current?.getBoundingClientRect() ?? new DOMRect(0, 0, 0, 0);
        if (targetDimensions.width === dimensions.width && targetDimensions.height === dimensions.height) return;
        setDimensions({ width: targetDimensions.width, height: targetDimensions.height });
    };

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
                canvas: canvasRef.current!,
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

    const load = (file: File) => {
        setFilename(file.name);
        const reader = new FileReader();
        reader.onload = () => {
            setAnimationWithBuffer(reader.result);
        };
        reader.readAsArrayBuffer(file);
    };

    const reset = () => {
        setFilename(null);
        setRiveAnimation(null);
        setStatus({ ...status, current: PlayerState.Idle });
        clearCanvas();
    };

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: true });
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: false });
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: true });
        e.dataTransfer.dropEffect = 'copy';
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: DragEvent<HTMLDivElement>) => {
        console.log(e.dataTransfer.files[0]);
        setStatus({ ...status, hovering: false });
        load(e.dataTransfer.files[0]);
        e.preventDefault();
        e.stopPropagation();
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return;
        }
        riveAnimation?.stop();
        const ctx = canvas.getContext('2d', { alpha: false });
        ctx!.clearRect(0, 0, canvas.width, canvas.height);
    };

    const shouldDisplayCanvas = () => [PlayerState.Active, PlayerState.Loading].includes(status.current);

    const component_prompt = () => {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ display: shouldDisplayCanvas() ? 'none' : 'flex' }}>
                <UploadIcon className="w-12 h-12"/>
                Drag and drop a Rive file or
                <Button onClick={() => inputRef.current?.click()} >
                    Browse
                </Button>
                <input hidden type="file" accept=".riv" ref={inputRef}
                    onChange={(e) => {
                        const files = e.target.files;
                        if (files) {
                            const droppedFile = files[0];
                            load(droppedFile);
                        }
                    }}
                />
            </div>
        );
    };

    const component_canvas = () => {
        return <canvas ref={canvasRef} style={{ display: shouldDisplayCanvas() ? 'block' : 'none' }} className="bg-green-400"/>
    }

    return (
        <div className="grid grid-cols-[1fr_300px] min-h-screen gap-10 p-20">
            <main className="flex flex-col gap-8 col-start-1">
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div
                            ref={previewRef}
                            className="relative w-full h-[600px] rounded-lg overflow-hidden"
                            onDrop={(e) => handleDrop(e)}
                            onDragOver={(e) => handleDragOver(e)}
                            onDragEnter={(e) => handleDragEnter(e)}
                            onDragLeave={(e) => handleDragLeave(e)}
                        >
                            { component_canvas() }
                            { component_prompt() }
                        </div>
                    </CardContent>
                </Card>
            </main>
            <Card>
                <CardHeader>
                    <CardTitle>Controls</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <ol className="list-inside list-decimal text-sm text-center sm:text-left">
                        <li className="mb-2">
                        Get started by editing{" "}
                            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-semibold">
                            app/page.tsx
                        </code>
                        .
                    </li>
                        <li>Save and see your changes instantly.</li>
                    </ol>
                    <Button
                        onClick={() => {
                            if (!riveAnimation) return;
                            isPlaying ? riveAnimation.pause() : riveAnimation.play();
                        }}
                    >
                        {isPlaying ? 'Pause' : 'Play'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
