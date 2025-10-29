import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Zap, User, Brain, Sparkles } from 'lucide-react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';

interface PersonalDetails {
    name: string;
    age: string;
    gender: string;
    occupation: string;
    hobby: string;
    relationshipStatus: string;
}

interface GayResult {
    gayness: number;
    desc: string;
    features: string[];
    analysis: string[];
}

interface FacialAnalysis {
    faceWidth: number;
    faceHeight: number;
    eyeDistance: number;
    symmetry: number;
    expressiveness: number;
}

const GayDetector = () => {
    const [step, setStep] = useState<'details' | 'photo' | 'analyzing' | 'result'>('details');
    const [personalDetails, setPersonalDetails] = useState<PersonalDetails>({
        name: '',
        age: '',
        gender: '',
        occupation: '',
        hobby: '',
        relationshipStatus: ''
    });
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<string[]>([]);
    const [result, setResult] = useState<GayResult | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadingModel, setLoadingModel] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);

    // Real facial features to analyze
    const facialFeatureMap = {
        wideEyes: { feature: "Expressive eyes", gayness: 14, desc: "windows to a fabulous soul detected" },
        symmetricalFace: { feature: "Perfect symmetry", gayness: 12, desc: "that face is TOO perfect, sus" },
        expressiveFace: { feature: "Animated expressions", gayness: 16, desc: "your face tells stories bro" },
        narrowFace: { feature: "Defined features", gayness: 11, desc: "bone structure is giving model" },
        wideFace: { feature: "Open expression", gayness: 13, desc: "friendly and approachable energy" },
        highCheekbones: { feature: "Sharp cheekbones", gayness: 15, desc: "could cut glass with those" },
        softFeatures: { feature: "Soft aesthetic", gayness: 12, desc: "gentle vibes all around" }
    };

    // Gay stereotypes based on hobbies/lifestyle
    const gayIndicators = [
        { feature: "Theater kid energy", gayness: 18, desc: "you definitely know every Hamilton song" },
        { feature: "Impeccable grooming", gayness: 14, desc: "your skincare routine has more steps than mine" },
        { feature: "Fashion sense too good", gayness: 17, desc: "straight guys don't dress this well, period" },
        { feature: "Iced coffee addiction", gayness: 13, desc: "let me guess, with oat milk?" },
        { feature: "Plant parent vibes", gayness: 12, desc: "you named all your plants didn't you" },
        { feature: "Listens to Charli XCX", gayness: 19, desc: "brat summer wasn't a phase for you" },
        { feature: "Gym obsession", gayness: 15, desc: "we get it, you go to equinox" },
        { feature: "Brunch enthusiast", gayness: 16, desc: "bottomless mimosas are your religion" },
        { feature: "Can't sit straight", gayness: 18, desc: "literally never seen you sit normally" },
        { feature: "Knows celebrity drama", gayness: 14, desc: "you follow deuxmoi religiously" },
        { feature: "Thrift shopping expert", gayness: 15, desc: "vintage = personality trait" },
        { feature: "Says 'slay' unironically", gayness: 19, desc: "girl boss energy off the charts" },
        { feature: "Broadway knowledge", gayness: 18, desc: "rent was not just a musical to you" },
        { feature: "Iced matcha latte person", gayness: 14, desc: "basic gay starter pack item #1" },
        { feature: "Drama magnet", gayness: 16, desc: "if drama doesn't find you, you'll create it" }
    ];

    const roastsByLevel = {
        ultra: [
            "Look, I'm not saying you're gay but even Liberace is telling you to tone it down",
            "My gaydar literally exploded. Had to get a new one. Send invoice to your address",
            "You walked out the closet so hard the door flew off its hinges bro",
            "Not even a spectrum at this point, you're the whole damn rainbow",
            "I've seen less gay energy at a pride parade, and that's saying something"
        ],
        high: [
            "Bro you're not fooling anyone. Not even yourself apparently",
            "The closet door is RIGHT there but you've been out so long you forgot where it is",
            "Your vibe is giving 'I listen to Lil Nas X unironically'",
            "Straight men everywhere are taking notes on what NOT to do"
        ],
        medium: [
            "Okay so like you're definitely giving off vibes but playing it subtle. We see you though",
            "You're giving 'I'm not like other gays' energy but plot twist - you are",
            "Bi-curious? More like bi-furious you haven't figured it out yet",
            "The vibes are there but you're still deciding if you wanna commit to the bit"
        ],
        low: [
            "Honestly? Not really getting it. You might just be a well-dressed straight guy (rare)",
            "Either you're deep in the closet or you're just... like that. Can't tell",
            "Your energy is giving 'I have a good relationship with my father'",
            "Not a lot of gay going on here chief. Maybe check back later?"
        ],
        confusing: [
            "My AI is having an existential crisis trying to figure you out",
            "You're giving nothing and everything at the same time. Schrödinger's gay",
            "I literally cannot tell if you're gay or just European",
            "Your vibe is so confusing even YOU don't know what's going on"
        ]
    };

    useEffect(() => {
        const loadModel = async () => {
            if (modelRef.current || loadingModel) return;

            setLoadingModel(true);
            try {
                await tf.setBackend('webgl');
                await tf.ready();

                const model = await blazeface.load();
                modelRef.current = model;
                setModelLoaded(true);
                console.log('✅ Face Detection Model loaded successfully!');
            } catch (error) {
                console.error('❌ Error loading model:', error);
            } finally {
                setLoadingModel(false);
            }
        };

        loadModel();
    }, []);

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPersonalDetails((prevDetails) => ({
            ...prevDetails,
            [name]: value
        }));
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setCameraActive(true);
            }
        } catch (err) {
            alert('Camera access denied or not available');
        }
    };

    const capturePhoto = () => {
        const video = videoRef.current;
        if (!video) return;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
        }
        setImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
            setCameraActive(false);
        }
    };

    const analyzeFacialFeatures = (prediction: any): FacialAnalysis => {
        const landmarks = prediction.landmarks as number[][];

        // Real calculations from facial landmarks
        const rightEye = landmarks[0];
        const leftEye = landmarks[1];
        // const nose = landmarks[2];
        const mouth = landmarks[3];
        const rightEar = landmarks[4];
        const leftEar = landmarks[5];

        // Calculate actual measurements
        const eyeDistance = Math.sqrt(
            Math.pow(rightEye[0] - leftEye[0], 2) +
            Math.pow(rightEye[1] - leftEye[1], 2)
        );

        const faceWidth = Math.sqrt(
            Math.pow(rightEar[0] - leftEar[0], 2) +
            Math.pow(rightEar[1] - leftEar[1], 2)
        );

        const faceHeight = Math.abs(mouth[1] - ((rightEye[1] + leftEye[1]) / 2));

        // Symmetry calculation (how aligned the eyes are)
        const symmetry = 100 - Math.abs(rightEye[1] - leftEye[1]) * 10;

        // Expressiveness (distance from eyes to mouth relative to face height)
        const expressiveness = (faceHeight / faceWidth) * 100;

        return {
            faceWidth,
            faceHeight,
            eyeDistance,
            symmetry: Math.min(Math.max(symmetry, 0), 100),
            expressiveness: Math.min(Math.max(expressiveness, 0), 100)
        };
    };

    const getPersonalityBonus = () => {
        let bonus = 0;
        const hobby = personalDetails.hobby.toLowerCase();
        const occupation = personalDetails.occupation.toLowerCase();

        if (hobby.includes('fashion') || hobby.includes('style')) bonus += 12;
        if (hobby.includes('theater') || hobby.includes('drama')) bonus += 15;
        if (hobby.includes('music') || hobby.includes('dance')) bonus += 10;
        if (hobby.includes('art') || hobby.includes('design')) bonus += 8;
        if (hobby.includes('makeup') || hobby.includes('beauty')) bonus += 14;
        if (hobby.includes('gym') || hobby.includes('fitness')) bonus += 11;
        if (hobby.includes('coffee') || hobby.includes('cafe')) bonus += 8;

        if (occupation.includes('hair') || occupation.includes('stylist')) bonus += 16;
        if (occupation.includes('fashion') || occupation.includes('designer')) bonus += 14;
        if (occupation.includes('theater') || occupation.includes('actor')) bonus += 13;
        if (occupation.includes('artist') || occupation.includes('creative')) bonus += 9;
        if (occupation.includes('barista') || occupation.includes('coffee')) bonus += 11;

        return bonus;
    };

    const analyzeGayness = async () => {
        setAnalyzing(true);
        setStep('analyzing');
        setAnalysisProgress([]);

        const addProgress = (text: string) => {
            setAnalysisProgress(prev => [...prev, text]);
        };

        try {
            if (modelRef.current && image) {
                addProgress("Loading your beautiful face...");
                await new Promise(r => setTimeout(r, 500));

                const img = new Image();
                img.src = image;

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                addProgress("Detecting facial landmarks...");
                await new Promise(r => setTimeout(r, 700));

                const predictions = await modelRef.current.estimateFaces(img, false);
                console.log('🔍 Detected faces:', predictions);

                if (predictions.length > 0) {
                    const prediction = predictions[0];

                    addProgress("Analyzing facial structure...");
                    await new Promise(r => setTimeout(r, 600));

                    // REAL facial analysis
                    const facialAnalysis = analyzeFacialFeatures(prediction);
                    console.log('📊 Facial Analysis:', facialAnalysis);

                    addProgress("Measuring gay indicators...");
                    await new Promise(r => setTimeout(r, 800));

                    let totalGayness = 35; // Base score
                    const detectedFeatures: string[] = [];
                    const analysisDetails: string[] = [];

                    // Analyze REAL facial features
                    if (facialAnalysis.eyeDistance > 70) {
                        const feat = facialFeatureMap.wideEyes;
                        totalGayness += feat.gayness;
                        detectedFeatures.push(feat.feature);
                        analysisDetails.push(`👁️ Wide-set expressive eyes detected`);
                    }

                    if (facialAnalysis.symmetry > 85) {
                        const feat = facialFeatureMap.symmetricalFace;
                        totalGayness += feat.gayness;
                        detectedFeatures.push(feat.feature);
                        analysisDetails.push(`✨ Facial symmetry: ${Math.round(facialAnalysis.symmetry)}%`);
                    }

                    if (facialAnalysis.expressiveness > 60) {
                        const feat = facialFeatureMap.expressiveFace;
                        totalGayness += feat.gayness;
                        detectedFeatures.push(feat.feature);
                        analysisDetails.push(`😊 High expressiveness score`);
                    }

                    const ratio = facialAnalysis.faceWidth / facialAnalysis.faceHeight;
                    if (ratio < 1.3) {
                        const feat = facialFeatureMap.narrowFace;
                        totalGayness += feat.gayness;
                        detectedFeatures.push(feat.feature);
                        analysisDetails.push(`📐 Narrow face structure`);
                    } else if (ratio > 1.5) {
                        const feat = facialFeatureMap.wideFace;
                        totalGayness += feat.gayness;
                        detectedFeatures.push(feat.feature);
                        analysisDetails.push(`📐 Wide face structure`);
                    }

                    addProgress("Checking personality indicators...");
                    await new Promise(r => setTimeout(r, 500));

                    // Add personality bonus
                    const personalityBonus = Math.min(getPersonalityBonus(), 20);
                    totalGayness += personalityBonus;

                    if (personalityBonus > 10) {
                        analysisDetails.push(`🎭 Your hobbies/job added +${personalityBonus}% gay points`);
                    }

                    // Add random stereotypical indicators
                    const numStereotypes = Math.floor(Math.random() * 2) + 2;
                    const shuffled = [...gayIndicators].sort(() => Math.random() - 0.5);

                    for (let i = 0; i < numStereotypes && i < shuffled.length; i++) {
                        const indicator = shuffled[i];
                        totalGayness += indicator.gayness;
                        detectedFeatures.push(indicator.feature);
                    }

                    addProgress("Finalizing gay calculations...");
                    await new Promise(r => setTimeout(r, 600));

                    // Cap at 99
                    totalGayness = Math.min(totalGayness, 99);

                    // Get roast
                    let description: string;
                    if (totalGayness >= 85) {
                        description = roastsByLevel.ultra[Math.floor(Math.random() * roastsByLevel.ultra.length)];
                    } else if (totalGayness >= 70) {
                        description = roastsByLevel.high[Math.floor(Math.random() * roastsByLevel.high.length)];
                    } else if (totalGayness >= 50) {
                        description = roastsByLevel.medium[Math.floor(Math.random() * roastsByLevel.medium.length)];
                    } else if (totalGayness >= 35) {
                        description = roastsByLevel.low[Math.floor(Math.random() * roastsByLevel.low.length)];
                    } else {
                        description = roastsByLevel.confusing[Math.floor(Math.random() * roastsByLevel.confusing.length)];
                    }

                    setResult({
                        gayness: totalGayness,
                        desc: description,
                        features: detectedFeatures,
                        analysis: analysisDetails
                    });
                    setStep('result');
                } else {
                    addProgress("No face detected, using vibes only...");
                    await new Promise(r => setTimeout(r, 1000));

                    const fallbackScore = 50 + Math.floor(Math.random() * 30);
                    setResult({
                        gayness: fallbackScore,
                        desc: roastsByLevel.confusing[0],
                        features: ["mysterious energy", "camera shy"],
                        analysis: ["No face detected - going by vibes alone"]
                    });
                    setStep('result');
                }
            }
        } catch (error) {
            console.error('Error analyzing:', error);
            setResult({
                gayness: 69,
                desc: "Something went wrong but you're probably gay anyway",
                features: ["error vibes"],
                analysis: ["Analysis failed but we're guessing 69%"]
            });
            setStep('result');
        } finally {
            setAnalyzing(false);
        }
    };

    const resetAll = () => {
        setStep('details');
        setPersonalDetails({
            name: '',
            age: '',
            gender: '',
            occupation: '',
            hobby: '',
            relationshipStatus: ''
        });
        setImage(null);
        setResult(null);
        setAnalysisProgress([]);
    };

    return (
        <div className="min-h-screen bg-[linear-gradient(to_right,_red,_orange,_yellow,_green,_blue,_indigo,_violet)] w-full p-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8 pt-8">
                    <h1 className="text-5xl font-black text-white mb-2 drop-shadow-lg">
                        AI GAY DETECTOR
                    </h1>
                    <p className="text-white text-lg opacity-90">
                        BINAKLA PA MORE
                    </p>
                    <div className="mt-2">
                        {loadingModel && (
                            <span className="text-yellow-300 text-sm">⏳ loading the gay-o-meter...</span>
                        )}
                        {modelLoaded && (
                            <span className="text-green-300 text-sm">✅ ready to judge you</span>
                        )}
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl p-8">
                    {step === 'details' && (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setStep('photo');
                            }}
                        >
                            <div className="flex items-center gap-2 mb-6">
                                <User className="text-purple-600" size={28} />
                                <h2 className="text-2xl font-bold text-gray-800">spill the tea about yourself</h2>
                            </div>

                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Name *</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={personalDetails.name}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="what should we call you?"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Age *</label>
                                <input
                                    type="number"
                                    name="age"
                                    value={personalDetails.age}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="don't lie, we can tell"
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Gender</label>
                                <input
                                    type="text"
                                    name="gender"
                                    value={personalDetails.gender}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="whatever you vibe with"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Occupation</label>
                                <input
                                    type="text"
                                    name="occupation"
                                    value={personalDetails.occupation}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="hair stylist? we already know"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Hobby</label>
                                <input
                                    type="text"
                                    name="hobby"
                                    value={personalDetails.hobby}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="let me guess... gym?"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-gray-700 font-bold mb-2">Relationship Status</label>
                                <input
                                    type="text"
                                    name="relationshipStatus"
                                    value={personalDetails.relationshipStatus}
                                    onChange={handleDetailsChange}
                                    className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-purple-500 focus:outline-none"
                                    placeholder="single? shocking"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-[linear-gradient(to_right,_red,_orange,_yellow,_green,_blue,_indigo,_violet)] text-white font-black py-4 rounded-xl transition text-lg hover:opacity-90"
                            >
                                alright let's see your face →
                            </button>
                        </form>
                    )}

                    {step === 'photo' && (
                        <>
                            <div className="bg-purple-100 p-4 rounded-xl mb-4">
                                <p className="text-sm text-gray-700">
                                    <strong>ok {personalDetails.name},</strong> time to show us what we're working with here
                                </p>
                            </div>

                            {cameraActive && (
                                <div className="mb-6">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full rounded-xl"
                                    />
                                    <button
                                        onClick={capturePhoto}
                                        className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition"
                                    >
                                        📸 take the pic
                                    </button>
                                </div>
                            )}

                            {image && !cameraActive && (
                                <div className="mb-6">
                                    <img src={image} alt="Uploaded" className="w-full rounded-xl shadow-lg" />
                                </div>
                            )}

                            {!image && !cameraActive && (
                                <div className="space-y-4 mb-6">
                                    <button
                                        onClick={startCamera}
                                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                                    >
                                        <Camera size={24} />
                                        take a selfie (you know you want to)
                                    </button>

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition"
                                    >
                                        <Upload size={24} />
                                        upload a pic
                                    </button>

                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />

                                    <button
                                        onClick={() => setStep('details')}
                                        className="w-full bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 rounded-xl transition"
                                    >
                                        ← wait go back
                                    </button>
                                </div>
                            )}

                            {image && !cameraActive && (
                                <button
                                    onClick={analyzeGayness}
                                    disabled={analyzing}
                                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 text-lg"
                                >
                                    <Zap size={24} />
                                    CHECK THE GAYNESS
                                </button>
                            )}
                        </>
                    )}

                    {step === 'analyzing' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center mb-6">
                                <Brain className="w-16 h-16 text-purple-600 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
                                AI Analysis in Progress...
                            </h2>
                            <div className="space-y-2">
                                {analysisProgress.map((progress, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center gap-3 bg-purple-50 p-3 rounded-lg animate-fade-in"
                                    >
                                        <Sparkles className="w-5 h-5 text-purple-600" />
                                        <span className="text-gray-700">{progress}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 'result' && result && (
                        <div className="bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl p-6 border-4 border-yellow-400">
                            <div className="text-center mb-4">
                                <div className="text-2xl font-bold text-gray-700 mb-3">
                                    {personalDetails.name}'s gay rating:
                                </div>
                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                                    {result.gayness}%
                                </div>
                                <div className="text-lg text-gray-700 mb-4">
                                    {result.desc}
                                </div>

                                {result.analysis && result.analysis.length > 0 && (
                                    <div className="bg-white rounded-xl p-4 mt-4 mb-4">
                                        <h3 className="font-bold text-gray-800 mb-2">AI Analysis:</h3>
                                        <div className="space-y-1 text-left text-sm">
                                            {result.analysis.map((item, idx) => (
                                                <div key={idx} className="text-gray-700">{item}</div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.features && result.features.length > 0 && (
                                    <div className="bg-white rounded-xl p-4 mt-4">
                                        <h3 className="font-bold text-gray-800 mb-3">what gave it away:</h3>
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {result.features.map((feature, idx) => (
                                                <span
                                                    key={idx}
                                                    className="bg-purple-100 text-purple-700 px-3 py-2 rounded-full text-sm font-semibold"
                                                >
                                                    💅 {feature}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={resetAll}
                                className="w-full mt-4 bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 rounded-xl transition"
                            >
                                test someone else (they can't be gayer than you)
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default GayDetector;