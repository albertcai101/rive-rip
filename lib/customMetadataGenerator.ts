import { Metadata } from 'next';
import { OpenGraph } from 'next/dist/lib/metadata/types/opengraph-types';
import { Twitter } from 'next/dist/lib/metadata/types/twitter-types';

interface PageSEOProps {
    title: string;
    description?: string;
    canonicalUrl?: string;
    ogType?: string;
    ogImage?: string;
    twitterCard?: string;
    keywords?: string[];
}

export function customMetadataGenerator({
    title,
    description = "Preview Rive animations and state machines in the browser.",
    canonicalUrl = 'https://rive.rip/',
    ogType = 'website',
    keywords = [
        "rive web preview", 
        "alternative rive preview", 
        "state machine support rive", 
        "rive preview tool", 
        "rive state machines", 
        "preview .riv files", 
        "rive.app alternative", 
        "rive preview with state machines", 
        "better rive file preview", 
        "developer rive preview",
        "team rive preview",
        "rive.app/preview alternative",
        "state machines in rive",
        "preview rive files online",
        "rive preview state machine support"
    ],
    ogImage = './ogimage.png',
    twitterCard = 'summary_large_image',
}: PageSEOProps): Metadata {
    const siteTitle = 'rive.rip';
    const fullTitle = `${title} | ${siteTitle}`;

    return {
        title: fullTitle,
        description,
        keywords: keywords.join(', '),
        openGraph: {
            title: fullTitle,
            description,
            type: ogType,
            url: canonicalUrl,
            images: [
                {
                    url: ogImage,
                },
            ],
        } as OpenGraph,
        twitter: {
            card: twitterCard,
            title: fullTitle,
            description,
            images: [ogImage],
        } as Twitter,
        alternates: {
            canonical: canonicalUrl,
        },
    };
}
