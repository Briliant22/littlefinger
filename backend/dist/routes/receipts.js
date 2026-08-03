"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const db_1 = __importDefault(require("../db"));
const router = (0, express_1.Router)();
const uploadDir = path_1.default.resolve(__dirname, "../../uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname) || ".jpg";
        cb(null, `receipt-${Date.now()}${ext}`);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files (jpg, jpeg, png, gif, webp) are allowed"));
        }
    },
});
async function getDefaultUserId() {
    const user = await db_1.default.user.findFirst();
    if (!user)
        throw new Error("No user found. Run db seed first.");
    return user.id;
}
const SCAN_MODELS = [
    "openrouter/free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-26b-a4b-it:free",
];
function isRetryableScanError(message) {
    return (message.includes("LLM response contains no JSON") ||
        message.includes("No content from LLM"));
}
async function scanWithLLM(imageBase64, mimeType, model = "openrouter/free") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error("OPENROUTER_API_KEY is not configured");
    }
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": "https://littlefinger.app",
        },
        body: JSON.stringify({
            model,
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Extract all line items from this receipt image. Return a JSON object with this exact structure:
{
  "merchant": "store name",
  "date": "YYYY-MM-DD",
  "currency": "IDR or USD or SGD etc",
  "total": number,
  "taxAmount": number,
  "items": [
    {
      "description": "item name",
      "quantity": number,
      "unitPrice": number,
      "amount": number,
      "category": "suggested category (Groceries, Dining, Transport, Utilities, Entertainment, Shopping, Health, Housing, Travel, Subscriptions, Other)",
      "confidence": number between 0 and 1
    }
  ]
}

Rules:
- For each item, extract quantity, unitPrice, and amount (amount = quantity * unitPrice). If no quantity is shown, default to 1.
- Do NOT include tax line items or rounding adjustments in the items array. Extract tax as a separate taxAmount field. If multiple tax lines exist, sum them. If no tax is shown, set to 0.
- The receipt's total is the ground truth. Items + tax may not equal total due to rounding — I will compute the difference.
Confidence should reflect how certain you are about each item's accuracy. If you cannot read the image or it's not a receipt, return {"error": "Could not parse receipt"}. Only return valid JSON, no markdown wrappers.`,
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            max_tokens: 2000,
            temperature: 0.1,
        }),
    });
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM API error (openrouter/free): ${response.status} ${errText}`);
    }
    const data = (await response.json());
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
        throw new Error("No content from LLM (openrouter/free)");
    }
    const jsonStart = content.indexOf("{");
    if (jsonStart === -1) {
        throw new Error(`LLM response contains no JSON: ${content.slice(0, 200)}`);
    }
    const jsonEnd = content.lastIndexOf("}");
    const cleaned = content
        .slice(jsonStart, jsonEnd + 1)
        .replace(/^```(?:json)?\s*/m, "")
        .replace(/\s*```$/m, "")
        .trim();
    const parsed = JSON.parse(cleaned);
    if (parsed.error) {
        throw new Error(parsed.error);
    }
    const items = parsed.items || [];
    const itemsTotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    const taxAmount = parsed.taxAmount ?? 0;
    const expectedTotal = itemsTotal + taxAmount;
    const roundingAdjustment = parsed.total - expectedTotal;
    return { ...parsed, _model: model, roundingAdjustment };
}
router.post("/scan", upload.single("receipt"), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            res.status(400).json({ error: "Receipt image is required" });
            return;
        }
        const imageBuffer = fs_1.default.readFileSync(file.path);
        const base64 = imageBuffer.toString("base64");
        const mimeType = file.mimetype || "image/jpeg";
        const userId = await getDefaultUserId();
        let scanResult;
        let lastError;
        for (const model of SCAN_MODELS) {
            try {
                scanResult = await scanWithLLM(base64, mimeType, model);
                break;
            }
            catch (err) {
                lastError = err;
                const msg = err instanceof Error ? err.message : "Failed to scan receipt";
                if (!isRetryableScanError(msg))
                    break;
            }
        }
        if (!scanResult) {
            const msg = lastError instanceof Error ? lastError.message : "Failed to scan receipt";
            await db_1.default.receipt.create({
                data: {
                    userId,
                    imagePath: file.filename,
                    rawOcrData: JSON.stringify({ error: msg }),
                    confidenceScores: "{}",
                },
            });
            res.status(422).json({ error: msg });
            return;
        }
        const confidenceScores = {};
        confidenceScores.merchant = scanResult.merchant ? 1.0 : 0;
        confidenceScores.date = scanResult.date ? 1.0 : 0;
        confidenceScores.currency = scanResult.currency ? 1.0 : 0;
        confidenceScores.total = scanResult.total ? 1.0 : 0;
        confidenceScores.taxAmount = scanResult.taxAmount != null ? 1.0 : 0;
        const items = scanResult.items;
        if (Array.isArray(items)) {
            items.forEach((item, i) => {
                confidenceScores[`item_${i}`] = item.confidence || 0.5;
            });
        }
        const receipt = await db_1.default.receipt.create({
            data: {
                userId,
                imagePath: file.filename,
                rawOcrData: JSON.stringify(scanResult),
                confidenceScores: JSON.stringify(confidenceScores),
            },
        });
        const scanItems = scanResult.items || [];
        res.json({
            receiptId: receipt.id,
            merchant: scanResult.merchant || "",
            date: scanResult.date || "",
            currency: scanResult.currency || "IDR",
            total: scanResult.total || 0,
            taxAmount: scanResult.taxAmount || 0,
            roundingAdjustment: scanResult.roundingAdjustment || 0,
            items: scanItems.map((item) => ({
                description: item.description || "",
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice || 0,
                amount: item.amount || 0,
                category: item.category || "Other",
                confidence: item.confidence || 0.5,
            })),
        });
    }
    catch (error) {
        console.error("Failed to scan receipt:", error);
        res.status(500).json({ error: "Failed to scan receipt" });
    }
});
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const receipt = await db_1.default.receipt.findUnique({
            where: { id },
        });
        if (!receipt) {
            res.status(404).json({ error: "Receipt not found" });
            return;
        }
        res.json(receipt);
    }
    catch (error) {
        console.error("Failed to fetch receipt:", error);
        res.status(500).json({ error: "Failed to fetch receipt" });
    }
});
exports.default = router;
//# sourceMappingURL=receipts.js.map