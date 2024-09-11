"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import { Rive, Layout, EventType, Fit, Alignment, } from '@rive-app/react-canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster,toast } from "sonner";

import { UploadIcon } from '@radix-ui/react-icons';
import { Upload } from 'lucide-react';
import { BookOpen } from 'lucide-react';
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
        console.log('riveAnimation useffect setting up event listeners');
        console.log('riveAnimation: ', riveAnimation);
        riveAnimation?.on(EventType.Load, () => {
            // TODO: stuff on successful load
            getAnimationList();
            getStateMachineList();
            console.log("riveAnimation eventlistener on load is setting status to active");
            setStatus({ current: PlayerState.Active, error: null });

            // const stateMachines = riveAnimation.stateMachineNames;
            // for (const stateMachine of stateMachines) {
            //     console.log('state machine inputs for ', stateMachine, ': ', riveAnimation.stateMachineInputs(stateMachine));
            // }
        });
        riveAnimation?.on(EventType.LoadError, () => {
            console.log("riveAnimation eventlistener on load error is setting status to error");
            setStatus({ current: PlayerState.Error, error: PlayerError.NoAnimation });
        });
        riveAnimation?.on(EventType.Play, () => setIsPlaying(true));
        riveAnimation?.on(EventType.Pause, () => setIsPlaying(false));
        riveAnimation?.on(EventType.Stop, () => setIsPlaying(false));
            
    }, [riveAnimation]);

    useEffect(() => {
        console.log('status: ', status);
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
            console.log('setting animation with buffer');
            setRiveAnimation(new Rive({
                buffer: buffer as ArrayBuffer,
                canvas: canvasRef.current!,
                autoplay: true,
                layout: new Layout({
                    fit: Fit.Cover,
                    alignment: Alignment.Center,
                }),
            }));
            console.log("setAnimationWithBuffer is setting status to active");
            setStatus({ current: PlayerState.Active });
        } catch (e) {
            console.log("setAnimationWithBuffer is setting status to error");
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
        console.log('resetting');
        setIsPlaying(true);
        setFilename(null);
        setRiveAnimation(null);
        setAnimationList(null);
        setStateMachineList(null);
        setStatus({ ...status, current: PlayerState.Idle });
        clearCanvas();
    };

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
        toast.error("Your file has no animations.", {
            // action: {
            //     label: "Okay",
            //     onClick: () => console.log("Okay"),
            // },
        });
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
            <div id='container' className="px-8 max-w-[1400px] mx-auto">
                <div className="relative flex w-full flex-col items-start">
                    <section className="mx-auto flex flex-col items-start gap-2 px-4 py-8 md:py-12 md:pb-8 lg:py-12 lg::pb-10 w-full">
                        <a className="group inline-flex items-center px-0.5 text-sm font-medium" href="https://rive.app/community/doc/introduction/docvphVOrBbl" target="_blank" rel="noopener noreferrer">
                            <ReaderIcon className="h-4 w-4" />
                            <Separator orientation="vertical" className="mx-2 h-4" />
                            <span className="underline-offset-4 group-hover:underline">rive docs</span>
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
                <div className="grid grid-cols-[1fr_300px] min-h-screen gap-10">
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
                            <Button
                                variant="outline"
                                onClick={() =>
                                    fireErrorToast()
                                }
                            >
                                Show Toast
                            </Button>
                            <Tabs defaultValue="animations" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="animations">Animations</TabsTrigger>
                                    <TabsTrigger value="state-machines">State Machines</TabsTrigger>
                                </TabsList>
                                <TabsContent value="animations">
                                    <ol className="list-inside list-decimal text-sm text-center sm:text-left">
                                        {animationList?.animations.map((animation, index) => (
                                            <li key={index} className="mb-2">
                                                {animation}
                                            </li>
                                        ))}
                                    </ol>
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
            </div>
        </main>
    );
}
