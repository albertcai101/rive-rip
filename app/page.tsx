"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import { Rive, Layout, EventType, Fit, Alignment, } from '@rive-app/react-canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster,toast } from "sonner";

import { UploadIcon } from '@radix-ui/react-icons';
import { Upload } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { LaptopIcon } from '@radix-ui/react-icons';
import { ReaderIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

type RiveAnimations = {
    animations: string[];
    active: string;
};

type RiveStateMachines = {
    stateMachines: string[];
    active: string;
};

export default function Home() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<Status>({ current: PlayerState.Idle, hovering: false });
    const [filename, setFilename] = useState<string | null>(null);
    const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
    const [animationList, setAnimationList] = useState<RiveAnimations | null>(null);
    const [stateMachineList, setStateMachineList] = useState<RiveStateMachines | null>(null);

    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });
    
    useEffect(() => {
        if (!riveAnimation) return;

        const handleLoad = () => {
            getAnimationList();
            getStateMachineList();
            setStatus({ current: PlayerState.Active, error: null });
        };

        const handleLoadError = () => {
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleStop = () => setIsPlaying(false);

        riveAnimation.on(EventType.Load, handleLoad);
        riveAnimation.on(EventType.LoadError, handleLoadError);
        riveAnimation.on(EventType.Play, handlePlay);
        riveAnimation.on(EventType.Pause, handlePause);
        riveAnimation.on(EventType.Stop, handleStop);

        return () => {
            if (riveAnimation) {
                riveAnimation.off(EventType.Load, handleLoad);
                riveAnimation.off(EventType.LoadError, handleLoadError);
                riveAnimation.off(EventType.Play, handlePlay);
                riveAnimation.off(EventType.Pause, handlePause);
                riveAnimation.off(EventType.Stop, handleStop);
            }
        };
    }, [riveAnimation]);

    useEffect(() => {
        if (status.current === PlayerState.Error && status.error !== null) {
            reset();
            fireErrorToast();
        } else {
            if (status.current === PlayerState.Active && !animationList) { getAnimationList(); }
            if (status.current === PlayerState.Active && !stateMachineList) { getStateMachineList(); }
        }
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

    const togglePlayback = () => {
        const active = animationList?.active;
        if (active) {
            !isPlaying && riveAnimation?.play(active);
            isPlaying && riveAnimation?.pause(active);
        }
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
        setIsPlaying(true);
        setFilename(null);
        setRiveAnimation(null);
        setAnimationList(null);
        setStateMachineList(null);
        setStatus({ ...status, current: PlayerState.Idle });
        clearCanvas();
    };

    const setActiveAnimation = (animation: string) => {
        if (!riveAnimation) return;
        if (!animationList) return;

        clearCanvas();
        if (riveAnimation) {
            riveAnimation.stop(animationList?.active);
            setAnimationList({
                ...animationList,
                active: animation,
            });
            riveAnimation.play(animation);
        }
    }

    const getAnimationList = () => {
        const animations = riveAnimation?.animationNames;
        if (!animations) return;

        console.log('animations: ', animations);
        setAnimationList({ animations, active: animations[0] });
    }

    const getStateMachineList = () => {
        const stateMachines = riveAnimation?.stateMachineNames;
        if (!stateMachines) return;

        console.log('state machines: ', stateMachines);
        setStateMachineList({ stateMachines, active: stateMachines[0] });
    }

    const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
        setStatus({ ...status, hovering: true });
        e.preventDefault();
        e.stopPropagation();
    }

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

    const fireErrorToast = () => {
        toast.error("Your file has no animations.");
    }

    const component_prompt = () => {
        return (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4" style={{ display: shouldDisplayCanvas() ? 'none' : 'flex' }}>
                <Upload className="w-8 h-8"/>
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
        <main className="flex-1 font-[family-name:var(--font-geist-sans)]">
            <Toaster richColors visibleToasts={10}/>
            <div id='container' className="px-8 max-w-[1400px] mx-auto pb-20">
                <div className="relative flex w-full flex-col items-start">
                    <section className="mx-auto flex flex-col items-start gap-2 px-4 py-8 md:py-12 md:pb-8 lg:py-12 lg::pb-10 w-full">
                        <a className="group inline-flex items-center px-0.5 text-sm font-medium" href="https://editor.rive.app/" target="_blank" rel="noopener noreferrer">
                            <LaptopIcon className="h-4 w-4" />
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <span className="underline-offset-4 group-hover:underline">open rive</span>
                            <ArrowRight className="h-4 w-4 ml-1" />
                        </a>
                        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1] hidden md:block">
                            Rive Web Runtime, Upgraded.
                        </h1>
                        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-4xl lg:leading-[1.1] md:hidden">
                            Rive Runtime.
                        </h1>
                        <p className="max-w-2xl text-lg font-light text-foreground"> Test interactions through animations and the state machine.</p>
                        <div className="fex w-full items-center justify-start gap-2 py-2">
                            <div className="flex items-center gap-2">
                                <a href="https://github.com/spellr-org/rive-rip" target="_blank" rel="noopener noreferrer">
                                    <Button size="xs">
                                        Star on GitHub
                                    </Button>
                                </a>
                                <a href="https://rive.app/preview/" target="_blank" rel="noopener noreferrer">
                                    <Button size="xs" variant="ghost">
                                        Compare with Old Rive Preview
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="grid grid-cols-[1fr_300px]  gap-10">
                    <div className="flex flex-col gap-8 col-start-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Preview
                                </CardTitle>
                                <CardDescription>
                                    {filename ? `${filename}` : 'Choose a file to get started.'}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
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
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Controls</CardTitle>
                            <CardDescription>Interact with the animation.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <Tabs defaultValue="animations" className="w-full flex flex-col items-center">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="animations">Animations</TabsTrigger>
                                    <TabsTrigger value="state-machines">State Machines</TabsTrigger>
                                </TabsList>
                                <TabsContent value="animations" className="w-full">
                                    <div className="w-full">
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                            {animationList?.animations.map((animation, index) => (
                                                <li key={index} className="w-full">
                                                    <Button
                                                        variant={animationList.active === animation ? "default" : "outline"} // ShadCN button variant
                                                        onClick={() => setActiveAnimation(animation)}
                                                        className="w-full"
                                                        size="xs"
                                                    >
                                                        {animation}
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </TabsContent>
                                <TabsContent value="state-machines">
                                    <ol className="list-inside list-decimal text-sm text-center sm:text-left">
                                        {stateMachineList?.stateMachines.map((stateMachine, index) => (
                                            <li key={index} className="mb-2">
                                                {stateMachine}
                                            </li>
                                        ))}
                                    </ol>
                                </TabsContent>
                            </Tabs>
                            <Separator orientation="horizontal" />
                            <Button
                                onClick={() => { togglePlayback(); }}
                                disabled={status.current !== PlayerState.Active}
                                variant="secondary"
                            >
                                {status.current !== PlayerState.Active ? "Play/Pause" : isPlaying ? 'Pause' : 'Play'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}
