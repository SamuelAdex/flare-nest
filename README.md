# 🧾 Batch Payouts & Proof-of-Payment Portal on Flare

**Track 2 — Payouts & Batch Payments Portal**
Flare × ProofRails Bounty Submission

---

## 🧠 Overview

This project is a **batch payouts and reporting platform** built on **Flare**, designed for teams, platforms, and organizations that need to pay multiple recipients while generating **audit-grade, ISO-aligned payment records**.

Each payout:

* Executes as a **real FLR transaction**
* Generates structured payment evidence via **ProofRails**
* Is immutably **anchored on Flare** for verification

The result is a Web3 payouts system that feels closer to **payroll, affiliate payouts, and accounting workflows** than a traditional crypto dashboard.

---

## 🎯 Problem

While crypto payments are fast and global, they lack:

* Standardized payment records
* Verifiable receipts
* Accounting-ready exports
* Clear audit trails for teams and recipients

This creates friction for:

* Payroll and contractor payouts
* Affiliate and reward programs
* DAO and Web3 team operations

---

## ✅ Solution

This application provides:

* **Batch payout execution** using FLR
* **Per-recipient audit-grade payment records** generated via ProofRails
* **On-chain anchoring** of proof references on Flare
* **Admin and recipient dashboards** for transparency and reporting

Importantly, the system avoids risky batch smart contracts and instead uses a **safe, industry-aligned architecture**.

---

## 🏗️ Architecture (High Level)

### Key Design Principle

> A “batch” is an **off-chain abstraction** composed of multiple independent on-chain payments.

### Flow

1. Admin creates a batch (off-chain)
2. Each recipient receives an individual FLR transfer
3. Each transaction hash is registered in the backend
4. ProofRails generates ISO-aligned payment records
5. Proof references are anchored on Flare
6. Batch is completed once all payments are anchored

This ensures:

* No pooled funds
* No contract custody risk
* Full auditability per payment

---

## 🔄 Payout Lifecycle

For **each recipient** in a batch:

1. **FLR Transfer**

   * Standard ERC-20 `transfer()` on Flare
   * Signed via WalletConnect

2. **Payment Registration**

   * Transaction hash stored in MongoDB
   * Linked to batch and recipient

3. **ProofRails Integration**

   * ISO-aligned records generated (`pain`, `pacs`, `remt`)
   * Downloadable proof bundle created

4. **Flare Anchoring**

   * Proof reference anchored via a lightweight smart contract
   * Creates immutable verification link

---

## 📦 Features

### 👩‍💼 Admin Dashboard

* Create and manage payout batches
* Upload or input multiple recipients
* Execute batch payouts
* Track per-recipient status
* View batch-level summaries and reports

### 👤 Recipient Portal

* View received payments
* Download audit-grade payment records
* Verify Flare anchor references

### 📑 Reporting

* Per-payment ISO-aligned records
* Aggregated batch reporting
* Accounting-friendly exports

---

## 🔗 ProofRails Integration

ProofRails is used to generate **bank-grade, ISO-aligned payment records** for each payout.

Generated artifacts include:

* `pain.*` (payment initiation)
* `pacs.*` (payment status)
* `remt.*` (remittance information)

Each proof bundle:

* Is linked to a real Flare transaction
* Can be downloaded by admins or recipients
* Is anchored on Flare for verification

---

## 🔐 Smart Contract (Flare Proof Anchor)

A simple, safe smart contract is used to:

* Anchor ProofRails references on Flare
* Emit verifiable events
* Avoid holding or moving funds

The contract **does not custody assets** and is used only for proof anchoring.

---

## 🛠️ Tech Stack

* **Frontend:** Next.js (App Router)
* **Wallets:** WalletConnect + injected wallets
* **Blockchain:** Flare Network
* **Token:** FLR
* **Backend:** Next.js API routes
* **Database:** MongoDB (Mongoose)
* **Proof Engine:** ProofRails
* **Smart Contracts:** Solidity (Flare-compatible)

---

## 🧪 Local Development

### 1️⃣ Clone the repo

```bash
git clone <repo-url>
cd <repo>
```

### 2️⃣ Install dependencies

```bash
npm install
```

### 3️⃣ Environment variables

Create a `.env.local` file:

```env
MONGODB_URI=
PROOFRAILS_API_URL=
PROOFRAILS_API_KEY=
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
NEXT_PUBLIC_FLARE_RPC_URL=
```

### 4️⃣ Run the app

```bash
npm run dev
```

---

## 🧠 Why This Matters for Flare

This project positions Flare as:

* A **payments execution layer**
* A **proof-of-payment anchor**
* A hub for **accounting-ready Web3 finance**

It bridges the gap between:

> “Sending crypto”
> and
> “Running real financial operations on-chain”

---

## 🏁 Submission Notes

* All payments are real FLR transactions
* All proofs are generated via ProofRails APIs
* All proof references are anchored on Flare
* A working frontend demonstrates real user flows

---

## 🙌 Acknowledgements

* **Flare Network** — for enabling scalable, interoperable Web3 finance
* **ProofRails** — for bringing ISO-aligned, audit-grade payments to blockchain systems

---

## 📣 Feedback & Contributions

Feedback, reviews, and suggestions are welcome.
This project is designed to evolve into broader payout, payroll, and treasury tooling for Web3 teams.

---

**Built for the Flare × ProofRails Bounty — Track 2** 🚀
