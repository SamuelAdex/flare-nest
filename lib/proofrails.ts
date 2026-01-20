type ProofRailsPaymentPayload = {
    paymentId: string;
    network: string;
    txHash: string;
    asset: string;
    amount: string;
    sender: { address: string };
    recipient: { address: string };
    timestamp: string;
    memo?: string;
};

interface RecordTipRequestBody {
    tip_tx_hash: string;
    chain: string;
    amount: number;
    currency: string;
    sender_wallet: string;
    receiver_wallet: string;
    reference: string;
}

export async function createProofRailsRecord(
    payload: ProofRailsPaymentPayload
) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
        const baseUrl = process.env.PROOFRAILS_API_URL?.endsWith("/")
            ? process.env.PROOFRAILS_API_URL.slice(0, -1)
            : process.env.PROOFRAILS_API_URL;

        const res = await fetch(
            `${baseUrl}/iso/record-tip`,
            {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "X-API-Key": `${process.env.PROOFRAILS_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tip_tx_hash: payload.txHash,
                    chain: payload.network === "coston2" ? "coston2" : payload.network,
                    amount: Number(payload.amount),
                    currency: payload.asset === "FLR" ? "FLR" : payload.asset,
                    sender_wallet: payload.sender.address,
                    receiver_wallet: payload.recipient.address,
                    reference: payload.memo || payload.paymentId,
                }),
            }
        );

        console.log("ProofRails Request:", {
            url: `${baseUrl}/iso/record-tip`,
            chain: payload.network === "coston2" ? "coston2" : payload.network,
            currency: payload.asset === "FLR" ? "FLR" : payload.asset,
            amount: Number(payload.amount),
        });

        const data = await res.json();
        console.log("ProofRails Response:", data);

        if (!res.ok) {
            throw new Error(`ProofRails API error: ${JSON.stringify(data)}`);
        }

        return data;
    } finally {
        clearTimeout(timeout);
    }
}

