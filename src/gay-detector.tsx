import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Zap, User } from 'lucide-react';
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
}

const GayDetector = () => {
    const [step, setStep] = useState<'details' | 'photo' | 'result'>('details');
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
    const [result, setResult] = useState<GayResult | null>(null);
    const [modelLoaded, setModelLoaded] = useState(false);
    const [loadingModel, setLoadingModel] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [cameraActive, setCameraActive] = useState(false);
    const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);

    // ACTUAL gay stereotypes and traits (for fun, obviously)
    const gayIndicators = [
        { feature: "That eyebrow arch", gayness: 15, desc: "bro your eyebrows are literally having a conversation" },
        { feature: "Theater kid energy", gayness: 18, desc: "you definitely know every Hamilton song" },
        { feature: "The gay hand thing", gayness: 16, desc: "limp wrist detected, pride confirmed" },
        { feature: "Impeccable grooming", gayness: 14, desc: "your skincare routine has more steps than mine" },
        { feature: "Fashion sense too good", gayness: 17, desc: "straight guys don't dress this well, period" },
        { feature: "Iced coffee addiction", gayness: 13, desc: "let me guess, with oat milk?" },
        { feature: "Plant parent vibes", gayness: 12, desc: "you named all your plants didn't you" },
        { feature: "Tote bag energy", gayness: 11, desc: "probably says something pretentious on it" },
        { feature: "Listens to Charli XCX", gayness: 19, desc: "brat summer wasn't a phase for you" },
        { feature: "Knows all the TikTok dances", gayness: 14, desc: "chronically online gay behavior" },
        { feature: "Gym obsession", gayness: 15, desc: "we get it, you go to equinox" },
        { feature: "Brunch enthusiast", gayness: 16, desc: "bottomless mimosas are your religion" },
        { feature: "Can't sit straight", gayness: 18, desc: "literally never seen you sit normally in a chair" },
        { feature: "Obsessed with candles", gayness: 12, desc: "your apartment probably smells like eucalyptus" },
        { feature: "Septum piercing or wants one", gayness: 13, desc: "alt gay starter pack" },
        { feature: "Colorful socks", gayness: 11, desc: "the only pop of color in your outfit" },
        { feature: "Knows celebrity drama", gayness: 14, desc: "you follow deuxmoi religiously" },
        { feature: "Impeccable music taste", gayness: 16, desc: "phoebe bridgers is your therapist" },
        { feature: "Thrift shopping expert", gayness: 15, desc: "vintage = personality trait" },
        { feature: "Says 'slay' unironically", gayness: 19, desc: "girl boss energy off the charts" },
        { feature: "Overshares on main", gayness: 13, desc: "your instagram story is basically a diary" },
        { feature: "Therapy talk 24/7", gayness: 14, desc: "my therapist said vibes" },
        { feature: "Astrology obsessed", gayness: 12, desc: "mercury is NOT in retrograde rn" },
        { feature: "Has a signature scent", gayness: 15, desc: "probably costs more than my rent" },
        { feature: "Drama magnet", gayness: 16, desc: "if drama doesn't find you, you'll create it" },
        { feature: "Broadway knowledge", gayness: 18, desc: "rent was not just a musical to you" },
        { feature: "Knows all Drag Race queens", gayness: 17, desc: "can recite seasons 4-6 by heart" },
        { feature: "Iced matcha latte person", gayness: 14, desc: "basic gay starter pack item #1" },
        { feature: "Unnecessary accessories", gayness: 13, desc: "do you really need 3 rings though?" },
        { feature: "Loves a good cry", gayness: 15, desc: "emotional availability: 100%" },
        { feature: "Neutral color palette obsession", gayness: 12, desc: "beige is NOT a personality" },
        { feature: "Knows wine terminology", gayness: 14, desc: "this pinot has oaky undertones" },
        { feature: "Vintage band tees", gayness: 13, desc: "you definitely don't listen to that band" },
        { feature: "Strong opinions on fonts", gayness: 16, desc: "papyrus is a WAR CRIME apparently" },
        { feature: "Reusable tote bag collection", gayness: 15, desc: "saving the planet one ugly bag at a time" },
        { feature: "Room is an aesthetic", gayness: 14, desc: "your bedroom is an instagram post" },
        { feature: "Knows all the memes", gayness: 12, desc: "terminally online behavior" },
        { feature: "Crypto/NFT hater", gayness: 13, desc: "passionate about hating the right things" },
        { feature: "Pearl earring energy", gayness: 11, desc: "you think you're harry styles" },
        { feature: "Emotional support water bottle", gayness: 15, desc: "hydroflask = personality" }
    ];

    const roastsByLevel = {
        ultra: [
            "Look, I'm not saying you're gay but even Liberace is telling you to tone it down",
            "My gaydar literally exploded. Had to get a new one. Send invoice to your address",
            "You walked out the closet so hard the door flew off its hinges bro",
            "Not even a spectrum at this point, you're the whole damn rainbow",
            "I've seen less gay energy at a pride parade, and that's saying something",
            "Your gay card was approved before you even applied. VIP status automatically granted"
        ],
        high: [
            "Bro you're not fooling anyone. Not even yourself apparently",
            "The closet door is RIGHT there but you've been out so long you forgot where it is",
            "Your vibe is giving 'I listen to Lil Nas X unironically'",
            "Straight men everywhere are taking notes on what NOT to do",
            "You probably have a playlist called 'sad gay shit' don't lie"
        ],
        medium: [
            "Okay so like you're definitely giving off vibes but playing it subtle. We see you though",
            "You're giving 'I'm not like other gays' energy but plot twist - you are",
            "Bi-curious? More like bi-furious you haven't figured it out yet",
            "Your Spotify wrapped probably outed you before I could",
            "The vibes are there but you're still deciding if you wanna commit to the bit"
        ],
        low: [
            "Honestly? Not really getting it. You might just be a well-dressed straight guy (rare)",
            "Either you're deep in the closet or you're just... like that. Can't tell",
            "Your energy is giving 'I have a good relationship with my father'",
            "Suspiciously straight behavior detected. Are you okay?",
            "Not a lot of gay going on here chief. Maybe check back later?"
        ],
        confusing: [
            "My AI is having an existential crisis trying to figure you out",
            "You're giving nothing and everything at the same time. Schrödinger's gay",
            "I literally cannot tell if you're gay or just European",
            "Your vibe is so confusing even YOU don't know what's going on",
            "The audacity to be this ambiguous. Respect honestly"
        ]
    };

    const defaultResults: GayResult[] = [
        {
            gayness: 69,
            desc: "nice percentage bro. your energy is confusing as hell but in a hot way i guess",
            features: ["mysterious gay aura", "plays both sides"]
        },
        {
            gayness: 73,
            desc: "you're giving chaotic bisexual energy. commitment issues? we know.",
            features: ["can't make decisions", "disaster gay vibes"]
        },
        {
            gayness: 82,
            desc: "strong gay presence detected but you probably already knew that",
            features: ["confident in their sexuality", "making everyone else question theirs"]
        },
        {
            gayness: 77,
            desc: "soft boy energy detected. you cry during pixar movies don't you",
            features: ["emotional damage", "needs a hug"]
        }
    ];

    // Load BlazeFace model on mount
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

    const getPersonalityBonus = () => {
        let bonus = 0;
        const hobby = personalDetails.hobby.toLowerCase();
        const occupation = personalDetails.occupation.toLowerCase();

        // MAJOR gay hobbies
        if (hobby.includes('fashion') || hobby.includes('style') || hobby.includes('design')) bonus += 12;
        if (hobby.includes('theater') || hobby.includes('drama') || hobby.includes('acting')) bonus += 15;
        if (hobby.includes('music') || hobby.includes('singing') || hobby.includes('dance')) bonus += 10;
        if (hobby.includes('art') || hobby.includes('painting') || hobby.includes('drawing')) bonus += 8;
        if (hobby.includes('makeup') || hobby.includes('beauty')) bonus += 14;
        if (hobby.includes('cooking') || hobby.includes('baking')) bonus += 7;
        if (hobby.includes('plant') || hobby.includes('garden')) bonus += 9;
        if (hobby.includes('gym') || hobby.includes('fitness') || hobby.includes('workout')) bonus += 11;
        if (hobby.includes('yoga') || hobby.includes('pilates')) bonus += 10;
        if (hobby.includes('coffee') || hobby.includes('cafe')) bonus += 8;
        if (hobby.includes('thrift') || hobby.includes('vintage')) bonus += 9;
        if (hobby.includes('read') || hobby.includes('book')) bonus += 6;

        // MAJOR gay occupations
        if (occupation.includes('hair') || occupation.includes('stylist') || occupation.includes('salon')) bonus += 16;
        if (occupation.includes('fashion') || occupation.includes('designer')) bonus += 14;
        if (occupation.includes('interior') || occupation.includes('decor')) bonus += 12;
        if (occupation.includes('theater') || occupation.includes('performance') || occupation.includes('actor')) bonus += 13;
        if (occupation.includes('artist') || occupation.includes('creative')) bonus += 9;
        if (occupation.includes('barista') || occupation.includes('coffee')) bonus += 11;
        if (occupation.includes('florist')) bonus += 10;
        if (occupation.includes('makeup')) bonus += 15;
        if (occupation.includes('yoga') || occupation.includes('instructor')) bonus += 9;
        if (occupation.includes('social media') || occupation.includes('influencer')) bonus += 12;

        return bonus;
    };

    const analyzeGayness = async () => {
        setAnalyzing(true);

        try {
            if (modelRef.current && image) {
                const img = new Image();
                img.src = image;

                await new Promise((resolve) => {
                    img.onload = resolve;
                });

                const predictions = await modelRef.current.estimateFaces(img, false);
                console.log('🔍 Detected faces:', predictions);

                if (predictions.length > 0) {
                    // Calculate gayness - FIXED VERSION
                    let totalGayness = Math.floor(Math.random() * 20) + 30; // Base: 30-50 (lower start)
                    const detectedFeatures: string[] = [];

                    // Randomly select 3-4 indicators (reduced from 4-6)
                    const numIndicators = Math.floor(Math.random() * 2) + 3;
                    const shuffled = [...gayIndicators].sort(() => Math.random() - 0.5);

                    for (let i = 0; i < numIndicators && i < shuffled.length; i++) {
                        const indicator = shuffled[i];
                        totalGayness += indicator.gayness;
                        detectedFeatures.push(indicator.feature);
                    }

                    // Add personality bonus (but cap it at +20 max)
                    const personalityBonus = Math.min(getPersonalityBonus(), 20);
                    totalGayness += personalityBonus;

                    // Cap at 99 (no one gets perfect 100)
                    totalGayness = Math.min(totalGayness, 99);

                    // Get roast based on level
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
                        features: detectedFeatures
                    });
                    setStep('result');
                } else {
                    const randomResult = defaultResults[Math.floor(Math.random() * defaultResults.length)];
                    setResult(randomResult);
                    setStep('result');
                }
            } else {
                const randomResult = defaultResults[Math.floor(Math.random() * defaultResults.length)];
                setResult(randomResult);
                setStep('result');
            }
        } catch (error) {
            console.error('Error analyzing:', error);
            const randomResult = defaultResults[Math.floor(Math.random() * defaultResults.length)];
            setResult(randomResult);
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
                        {!loadingModel && !modelLoaded && (
                            <span className="text-red-300 text-sm">⚠️ backup mode (still gonna roast you tho)</span>
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
                                    {analyzing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                            analyzing the gayness...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={24} />
                                            CHECK THE GAYNESS
                                        </>
                                    )}
                                </button>
                            )}
                        </>
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