import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    return NextResponse.json({
        message: "Webhook endpoint is reachable",
        timestamp: new Date().toISOString(),
        url: request.url,
        method: request.method
    });
}

export async function POST(request: NextRequest) {

    const body = await request.text();

    return NextResponse.json({
        message: "Webhook test endpoint received POST",
        timestamp: new Date().toISOString(),
        bodyLength: body.length,
        hasStripeSignature: request.headers.has('stripe-signature')
    });
}