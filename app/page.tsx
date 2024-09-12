"use client";

import { DragEvent, useState, useRef, useEffect } from 'react';
import { Rive, Layout, EventType, Fit, Alignment, useStateMachineInput, StateMachineInputType } from '@rive-app/react-canvas';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Toaster, toast } from "sonner";

import { Upload } from 'lucide-react';
import { LaptopIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const fitValues: (keyof typeof Fit)[] = [
    'Cover',
    'Contain',
    'Fill',
    'FitWidth',
    'FitHeight',
    'None',
    'ScaleDown',
];

const alignValues: (keyof typeof Alignment)[] = [
    'TopLeft',
    'TopCenter',
    'TopRight',
    'CenterLeft',
    'Center',
    'CenterRight',
    'BottomLeft',
    'BottomCenter',
    'BottomRight',
];

enum PlayerState {
    Idle,
    Loading,
    Active,
    Error,
}

enum PlayerError {
    NoAnimation,
}

type BackgroundColor = 'transparent' | 'white' | 'black'

type AlignFitIndex = {
    alignment: number;
    fit: number;
};

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

type RiveController = {
    active: "animations" | "state-machines";
};

export default function Home() {

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const [status, setStatus] = useState<Status>({ current: PlayerState.Idle, hovering: false });
    const [filename, setFilename] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string | null>(null);
    const [riveAnimation, setRiveAnimation] = useState<Rive | null>(null);
    const [animationList, setAnimationList] = useState<RiveAnimations | null>(null);
    const [stateMachineList, setStateMachineList] = useState<RiveStateMachines | null>(null);
    const [stateMachineInputs, setStateMachineInputs] = useState<any[]>([]);

    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [controller, setController] = useState<RiveController>({ active: "animations" });
    const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

    const [background, setBackground] = useState<BackgroundColor>('transparent');
    const [alignFitIndex, setAlignFitIndex] = useState<AlignFitIndex>({
        alignment: alignValues.indexOf('Center'),
        fit: fitValues.indexOf('Cover'),
    });
    
    useEffect(() => {
        if (!riveAnimation) return;

        const handleLoad = () => {
            getAnimationList();
            getStateMachineList();
            setStatus({ current: PlayerState.Active, error: null });
            setControllerState(controller.active);
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
        if (riveAnimation) {
            riveAnimation.layout = new Layout({
                fit: getFitValue(alignFitIndex),
                alignment: getAlignmentValue(alignFitIndex),
            });
        }
    }, [alignFitIndex]);

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
        setFileSize(formatFileSize(file.size));
        const reader = new FileReader();
        reader.onload = () => {
            setAnimationWithBuffer(reader.result);
        };
        reader.readAsArrayBuffer(file);
    };

    const formatFileSize = (bytes: number): string => {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
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

    const setControllerState = (state: string) => {
        // check if state is valid
        if (state !== "animations" && state !== "state-machines") return;

        setController({
            ...controller,
            active: state === "animations" ? "animations" : "state-machines",
        });

        if (state === "animations" && animationList) {
            setActiveAnimation(animationList.active);
        } else if (state === "state-machines" && stateMachineList) {
            setActiveStateMachine(stateMachineList.active);
        }
    }

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

    const setActiveStateMachine = (stateMachine: string) => {
        if (!riveAnimation) return;
        if (!stateMachineList) return;

        clearCanvas();
        if (riveAnimation) {
            riveAnimation.stop(stateMachineList?.active);
            setStateMachineList({
                ...stateMachineList,
                active: stateMachine,
            });
            riveAnimation.play(stateMachine);
        }

        // log all inputs to this state machine
        const inputs = riveAnimation?.stateMachineInputs(stateMachine);
        setStateMachineInputs(inputs);
    }

    const getAnimationList = () => {
        const animations = riveAnimation?.animationNames;
        if (!animations) return;

        setAnimationList({ animations, active: animations[0] });
    }

    const getStateMachineList = () => {
        const stateMachines = riveAnimation?.stateMachineNames;
        if (!stateMachines) return;

        setStateMachineList({ stateMachines, active: stateMachines[0] });
    }

    const getFitValue = (alignFitIndex: AlignFitIndex) => {
        return Fit[fitValues[alignFitIndex.fit]];
    };

    const getAlignmentValue = (alignFitIndex: AlignFitIndex) => {
        return Alignment[alignValues[alignFitIndex.alignment]];
    };

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
        return <canvas ref={canvasRef} style={{ display: shouldDisplayCanvas() ? 'block' : 'none' }} className={`${background === 'white' ? 'bg-white' : background === 'black' ? 'bg-black' : ''}`} />;
    }

    const component_controlsCard = () => {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Controls</CardTitle>
                    <CardDescription>Interact with the animation.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <Tabs 
                        value={controller.active}
                        className="w-full flex flex-col items-center"
                        onValueChange={(value) => setControllerState(value)}
                    >
                        <TabsList className="grid w-full grid-cols-2 mb-2">
                            <TabsTrigger value="animations">Animations</TabsTrigger>
                            <TabsTrigger value="state-machines">State Machines</TabsTrigger>
                        </TabsList>
                        <TabsContent value="animations" className="w-full">
                            <div className="w-full">
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                    {animationList?.animations.map((animation, index) => (
                                        <li key={index} className="w-full">
                                            <Button
                                                variant={animationList.active === animation ? "default" : "outline"}
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
                        <TabsContent value="state-machines" className="w-full flex flex-col items-center">
                            <Select
                                value={stateMachineList?.active}
                                onValueChange={(value) => setActiveStateMachine(value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select State Machine" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectLabel>Available State Machines</SelectLabel>
                                        {stateMachineList?.stateMachines.map((stateMachine) => (
                                            <SelectItem key={stateMachine} value={stateMachine}>{stateMachine}</SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <div className="w-full mt-2">
                                {/* first show the trigger inputs */}
                                {stateMachineInputs?.some((input) => input.type === StateMachineInputType.Trigger) && (
                                    <>
                                        <h2 className="text-lg font-medium mb-2">Triggers</h2>
                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                            {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Trigger).map((input, index) => (
                                                <li key={index} className="w-full">
                                                    <Button
                                                        variant="default"
                                                        onClick={() => { 
                                                            console.log('input: ', input);
                                                            input.fire();
                                                        }}
                                                        className="w-full"
                                                        size="xs"
                                                    >
                                                        {input.name}
                                                    </Button>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                {/* then show the boolean inputs */}
                                {stateMachineInputs.some((input) => input.type === StateMachineInputType.Boolean) && (
                                    <>
                                        <h2 className="text-lg font-medium mt-4 mb-2">Booleans</h2>
                                        <ul className="flex flex-col gap-2 w-full">
                                            {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Boolean).map((input, index) => (
                                                <li key={index} className="w-full">
                                                    <div className="flex items-center space-x-2">
                                                        <Switch 
                                                            id={input.name} 
                                                            value={input.value}
                                                            onCheckedChange={(value) => {
                                                                console.log('Boolean input: ', input.name, ' New value: ', value);
                                                                input.value = value;
                                                            }}
                                                        />
                                                        <Label htmlFor={input.name}>{input.name}</Label>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                                {/* then show the number inputs */}
                                {stateMachineInputs.some((input) => input.type === StateMachineInputType.Number) && (
                                    <>
                                        <h2 className="text-lg font-medium mt-4 mb-2">Numbers</h2>
                                        <ul className="flex flex-col gap-2 w-full">
                                            {stateMachineInputs?.filter((input) => input.type === StateMachineInputType.Number).map((input, index) => (
                                                <li key={index} className="w-full">
                                                    <div className="w-full max-w-sm">
                                                        <Label htmlFor={input.name}>
                                                            {input.name}
                                                        </Label>
                                                        <Input 
                                                            type="number" 
                                                            id={input.name}
                                                            placeholder="Enter a number" 
                                                            value={input.value}
                                                            onChange={(e) => {
                                                                const newValue = parseFloat(e.target.value);
                                                                console.log('Number input: ', input.name, ' New value: ', newValue);
                                                                input.value = newValue;
                                                                console.log(input);
                                                            }}
                                                        />
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </>
                                )}
                            </div>
                        </TabsContent>
                    </Tabs>
                    {/* only show the play/pause button if the controller is on animations */}
                    {controller.active === "animations" && (
                        <>
                            <Separator orientation="horizontal" />
                            <Button
                                onClick={() => { togglePlayback(); }}
                                disabled={status.current !== PlayerState.Active}
                                variant="secondary"
                            >
                                {status.current !== PlayerState.Active ? "Play/Pause" : isPlaying ? 'Pause' : 'Play'}
                            </Button>
                        </>
                    )}
                </CardContent>
            </Card>
        );
    }

    const component_appearanceCard = () => {
        return (
            <Card className="w-[25%] max-w-[250px] overflow-x-scroll">
                <CardHeader>
                    <CardTitle>
                        Appearance
                    </CardTitle>
                    <CardDescription>
                        Customize the appearance.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <h2 className="text-lg font-medium mb-2">Background Color</h2>
                        <Select
                            value={background}
                            onValueChange={(value) => setBackground(value as BackgroundColor)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Background" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Available Backgrounds</SelectLabel>
                                    <SelectItem value="transparent">Transparent</SelectItem>
                                    <SelectItem value="white">White</SelectItem>
                                    <SelectItem value="black">Black</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const component_layoutCard = () => {
        return (
            <Card className="w-[25%] overflow-x-scroll">
                <CardHeader>
                    <CardTitle>
                        Layout
                    </CardTitle>
                    <CardDescription>
                        Adjust the layout of the animation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <div className="flex flex-row flex-wrap justify-between items-center gap-2 mb-2">
                            <h2 className="text-lg font-medium pr-8">Fit</h2>
                            <div className="w-auto min-w-40">
                                <Select
                                    value={fitValues[alignFitIndex.fit]}
                                    onValueChange={(value) => setAlignFitIndex({ ...alignFitIndex, fit: fitValues.indexOf(value as keyof typeof Fit) })}
                                >
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Fit" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Available Fits</SelectLabel>
                                            {fitValues.map((fit) => (
                                                <SelectItem key={fit} value={fit}>{fit}</SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex flex-row justify-between flex-wrap">
                            <h2 className="text-lg font-medium mt-4 pr-8">Alignment</h2>
                            <div className="grid grid-rows-[36px_36px_36px] grid-cols-[36px_36px_36px] gap-2 mt-4 mb-2">
                                {alignValues.map((_, index) => (
                                    <button
                                        key={`btn_${index}`}
                                        onClick={() => setAlignFitIndex({ ...alignFitIndex, alignment: index })}
                                        className={`w-[36px] h-[36px] ${alignFitIndex.alignment === index ? 'bg-foreground' : 'bg-muted'} hover:bg-secondary-foreground rounded-lg transition-colors`}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const component_codeCard = () => {
        return (
            <Card className="flex-1 min-w-0 overflow-x-scroll">
                <CardHeader>
                    <CardTitle>
                        Code Snippets
                    </CardTitle>
                    <CardDescription>
                        Copy code for your project.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="w-full">
                        <Tabs defaultValue="web">
                            <TabsList className="mb-2">
                                <TabsTrigger value="web">Web</TabsTrigger>
                                <TabsTrigger value="react">React</TabsTrigger>
                                <TabsTrigger value="flutter">Flutter</TabsTrigger>
                                <TabsTrigger value="apple">iOS/macOS</TabsTrigger>
                                <TabsTrigger value="android">Android</TabsTrigger>
                            </TabsList>
                            <TabsContent value="web">Coming soon.</TabsContent>
                            <TabsContent value="react">Coming soon.</TabsContent>
                            <TabsContent value="flutter">Coming soon.</TabsContent>
                            <TabsContent value="apple">Coming soon.</TabsContent>
                            <TabsContent value="android">Coming soon.</TabsContent>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>
        );
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
                            <span className="underline-offset-4 group-hover:underline">open rive editor</span>
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
                                        Use Old Rive Preview
                                    </Button>
                                </a>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="grid grid-cols-[1fr_300px]  gap-4">
                    <div className="flex flex-col gap-8 col-start-1">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    Preview
                                </CardTitle>
                                <CardDescription>
                                    {filename ? (
                                        <span>
                                            {filename}
                                            <span className="inline-block min-w-2">&nbsp;</span>
                                            <span className="text-muted-foreground">({fileSize})</span>
                                        </span>
                                    ) : (
                                        'Choose a file to get started.'
                                    )}
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
                    { component_controlsCard() }
                    {/* 3 column grid that takes the whole width (both columns) */}
                    <div className="col-span-2 flex gap-4">
                        { component_appearanceCard() }
                        { component_layoutCard() }
                        { component_codeCard() }
                    </div>
                </div>
            </div>
        </main>
    );
}
