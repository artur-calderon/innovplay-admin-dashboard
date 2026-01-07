import { AvatarConfig } from '@/context/authContext';

interface AvatarPreviewProps {
    config: AvatarConfig;
    size?: number;
    className?: string;
}

export const AvatarPreview = ({ config, size = 128, className = '' }: AvatarPreviewProps) => {
    const generateAvatarUrl = (customConfig?: AvatarConfig): string => {
        const finalConfig = customConfig || config;
        const params = new URLSearchParams();

        if (finalConfig.seed) params.append('seed', finalConfig.seed);
        if (finalConfig.flip !== undefined) params.append('flip', String(finalConfig.flip));
        if (finalConfig.rotate !== undefined) params.append('rotate', String(finalConfig.rotate));
        if (finalConfig.scale !== undefined) params.append('scale', String(finalConfig.scale));
        if (finalConfig.radius !== undefined) params.append('radius', String(finalConfig.radius));
        if (finalConfig.size !== undefined) params.append('size', String(finalConfig.size));
        if (finalConfig.backgroundColor && finalConfig.backgroundColor.length > 0) params.append('backgroundColor', finalConfig.backgroundColor.join(','));
        if (finalConfig.backgroundType && finalConfig.backgroundType.length > 0) params.append('backgroundType', finalConfig.backgroundType.join(','));
        if (finalConfig.backgroundRotation && finalConfig.backgroundRotation.length > 0) params.append('backgroundRotation', finalConfig.backgroundRotation.join(','));
        if (finalConfig.translateX !== undefined) params.append('translateX', String(finalConfig.translateX));
        if (finalConfig.translateY !== undefined) params.append('translateY', String(finalConfig.translateY));
        if (finalConfig.clip !== undefined) params.append('clip', String(finalConfig.clip));
        if (finalConfig.randomizeIds !== undefined) params.append('randomizeIds', String(finalConfig.randomizeIds));
        if (finalConfig.beard && finalConfig.beard.length > 0) params.append('beard', finalConfig.beard.join(','));
        if (finalConfig.beardProbability !== undefined) params.append('beardProbability', String(finalConfig.beardProbability));
        if (finalConfig.earrings && finalConfig.earrings.length > 0) params.append('earrings', finalConfig.earrings.join(','));
        if (finalConfig.earringsColor && finalConfig.earringsColor.length > 0) params.append('earringsColor', finalConfig.earringsColor.join(','));
        if (finalConfig.earringsProbability !== undefined) params.append('earringsProbability', String(finalConfig.earringsProbability));
        if (finalConfig.eyebrows && finalConfig.eyebrows.length > 0) params.append('eyebrows', finalConfig.eyebrows.join(','));
        if (finalConfig.eyebrowsColor && finalConfig.eyebrowsColor.length > 0) params.append('eyebrowsColor', finalConfig.eyebrowsColor.join(','));
        if (finalConfig.eyes && finalConfig.eyes.length > 0) params.append('eyes', finalConfig.eyes.join(','));
        if (finalConfig.eyesColor && finalConfig.eyesColor.length > 0) params.append('eyesColor', finalConfig.eyesColor.join(','));
        if (finalConfig.freckles && finalConfig.freckles.length > 0) params.append('freckles', finalConfig.freckles.join(','));
        if (finalConfig.frecklesColor && finalConfig.frecklesColor.length > 0) params.append('frecklesColor', finalConfig.frecklesColor.join(','));
        if (finalConfig.frecklesProbability !== undefined) params.append('frecklesProbability', String(finalConfig.frecklesProbability));
        if (finalConfig.glasses && finalConfig.glasses.length > 0) params.append('glasses', finalConfig.glasses.join(','));
        if (finalConfig.glassesColor && finalConfig.glassesColor.length > 0) params.append('glassesColor', finalConfig.glassesColor.join(','));
        if (finalConfig.glassesProbability !== undefined) params.append('glassesProbability', String(finalConfig.glassesProbability));
        if (finalConfig.hair && finalConfig.hair.length > 0) params.append('hair', finalConfig.hair.join(','));
        if (finalConfig.hairAccessories && finalConfig.hairAccessories.length > 0) params.append('hairAccessories', finalConfig.hairAccessories.join(','));
        if (finalConfig.hairAccessoriesColor && finalConfig.hairAccessoriesColor.length > 0) params.append('hairAccessoriesColor', finalConfig.hairAccessoriesColor.join(','));
        if (finalConfig.hairAccessoriesProbability !== undefined) params.append('hairAccessoriesProbability', String(finalConfig.hairAccessoriesProbability));
        if (finalConfig.hairColor && finalConfig.hairColor.length > 0) params.append('hairColor', finalConfig.hairColor.join(','));
        if (finalConfig.head && finalConfig.head.length > 0) params.append('head', finalConfig.head.join(','));
        if (finalConfig.mouth && finalConfig.mouth.length > 0) params.append('mouth', finalConfig.mouth.join(','));
        if (finalConfig.mouthColor && finalConfig.mouthColor.length > 0) params.append('mouthColor', finalConfig.mouthColor.join(','));
        if (finalConfig.nose && finalConfig.nose.length > 0) params.append('nose', finalConfig.nose.join(','));
        if (finalConfig.noseColor && finalConfig.noseColor.length > 0) params.append('noseColor', finalConfig.noseColor.join(','));
        if (finalConfig.skinColor && finalConfig.skinColor.length > 0) params.append('skinColor', finalConfig.skinColor.join(','));

        return `https://api.dicebear.com/9.x/lorelei/svg?${params.toString()}`;
    };

    const avatarUrl = generateAvatarUrl(config);

    return (
        <div className={`flex items-center justify-center ${className}`}>
            <img
                src={avatarUrl}
                alt="Avatar"
                width={size}
                height={size}
                className="rounded-full border-2 border-white shadow-lg"
            />
        </div>
    );
};

