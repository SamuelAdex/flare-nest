export const proofAnchorAbi = [
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "batchId",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "paymentId",
				"type": "string"
			},
			{
				"internalType": "string",
				"name": "proofReference",
				"type": "string"
			}
		],
		"name": "anchorProof",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "string",
				"name": "batchId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "paymentId",
				"type": "string"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "proofReference",
				"type": "string"
			},
			{
				"indexed": true,
				"internalType": "address",
				"name": "anchoredBy",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "ProofAnchored",
		"type": "event"
	}
]