# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


class UniversalPredictionMarket(gl.Contract):
    """
    🎯 Universal AI-Driven Multi-Market Prediction System with Betting
    ----------------------------------------------------------------
    ✅ Supports multi-market creation, AI-based resolution & user betting
    ✅ Batch getters for faster frontend performance
    ✅ Built-in market statistics and duplicate bet prevention
    ✅ Fully schema-safe and optimized for GenLayer execution
    """

    # ---------------------------
    # Storage
    # ---------------------------
    market_ids: DynArray[str]
    questions: DynArray[str]
    categories: DynArray[str]
    options: DynArray[DynArray[str]]
    deadlines: DynArray[u64]
    prices: DynArray[u256]
    images: DynArray[str]
    creators: DynArray[str]
    resolved: DynArray[bool]
    results: DynArray[str]
    resolution_urls: DynArray[str]

    bettors: DynArray[str]
    bet_market_ids: DynArray[str]
    bet_options: DynArray[str]
    bet_amounts: DynArray[u256]
    total_bets: DynArray[u256]

    def __init__(self):
        pass

    # -------------------------------------------------
    # 🧩 Create Market
    # -------------------------------------------------
    @gl.public.write
    def create_market(
        self,
        market_id: str,
        question: str,
        category: str,
        options: DynArray[str],
        deadline: u64,
        price: u256,
        image_url: str,
        creator: str,
        resolution_url: str,
    ):
        for mid in self.market_ids:
            if mid == market_id:
                return f"⚠️ Market '{market_id}' already exists."

        self.market_ids.append(market_id)
        self.questions.append(question)
        self.categories.append(category)
        self.options.append(options)
        self.deadlines.append(deadline)
        self.prices.append(price)
        self.images.append(image_url)
        self.creators.append(creator)
        self.resolved.append(False)
        self.results.append("")
        self.resolution_urls.append(resolution_url.strip().strip('"').strip("'"))
        self.total_bets.append(u256(0))

        print(f"[INFO] ✅ Market '{market_id}' created by {creator}")
        return f"✅ Market '{market_id}' created successfully."

    # -------------------------------------------------
    # 💰 Place Bet (Duplicate Prevention)
    # -------------------------------------------------
    @gl.public.write
    def place_bet(self, market_id: str, option: str, amount: u256, bettor: str):
        print(f"[DEBUG] Placing bet on '{market_id}' by {bettor}")

        index = -1
        for i, mid in enumerate(self.market_ids):
            if mid == market_id:
                index = i
                break

        if index == -1:
            return f"❌ Market '{market_id}' not found."
        if self.resolved[index]:
            return f"⚠️ Market '{market_id}' already resolved — betting closed."

        # ✅ Prevent duplicate bets
        for i, (bet_mid, bet_bettor) in enumerate(zip(self.bet_market_ids, self.bettors)):
            if bet_mid == market_id and bet_bettor.lower() == bettor.lower():
                return f"⚠️ You already placed a bet on this market."

        if option not in self.options[index]:
            return f"❌ Invalid option. Valid: {', '.join(self.options[index])}"
        if amount <= 0:
            return "❌ Bet amount must be positive."

        self.bettors.append(bettor)
        self.bet_market_ids.append(market_id)
        self.bet_options.append(option)
        self.bet_amounts.append(amount)
        self.total_bets[index] += amount

        print(f"[INFO] 💸 {bettor} placed {amount} on '{option}' for '{market_id}'")
        return {"status": "success", "bettor": bettor, "market_id": market_id, "option": option, "amount": amount}

    # -------------------------------------------------
    # 🧠 Resolve Market (Improved AI Prompt)
    # -------------------------------------------------
    @gl.public.write
    def resolve_market(self, market_id: str, caller: str):
        print(f"[DEBUG] Resolving market '{market_id}' by {caller}")

        index = -1
        for i, mid in enumerate(self.market_ids):
            if mid == market_id:
                index = i
                break
        if index == -1:
            return f"❌ Market '{market_id}' not found."
        if self.resolved[index]:
            return f"⚠️ Market '{market_id}' already resolved."
        if caller != self.creators[index]:
            return f"🚫 Only the creator ({self.creators[index]}) can resolve this market."

        question = self.questions[index]
        options = ", ".join(self.options[index])
        url = self.resolution_urls[index]

        # --- AI reasoning ---
        def nondet_resolve():
            web_text = gl.nondet.web.render(url, mode="text")

            task = f"""
You are an **expert AI oracle** tasked with resolving a factual prediction market.
Use only the information visible in the provided web content.

### Resolution Guidelines:
1. Base your reasoning **strictly** on the web content — do not use prior knowledge or assumptions.
2. Match your answer **exactly** with one of the provided options: {options}.
3. If the content does not clearly support any option, return `"result": "undecided"`.
4. Think step-by-step before deciding. Verify the logic is consistent and factual.
5. The JSON output must strictly follow this structure:
{{
    "result": "<exact option from list OR undecided>",
    "confidence": "<0–100>",
    "explanation": "<short clear factual reason>"
}}

### Example:
{{
    "result": "yes",
    "confidence": "97",
    "explanation": "The article confirms the event occurred exactly as described."
}}

---
**Question:** {question}  
**Options:** {options}

Below is the web page content (truncated to 4000 chars):
{web_text[:4000]}

Now respond with the final verified JSON only.
            """
            print("[DEBUG] Executing nondet AI task...")
            raw = gl.nondet.exec_prompt(task).replace("```json", "").replace("```", "")
            return json.loads(raw)

        parsed = gl.eq_principle.strict_eq(nondet_resolve)
        result = parsed.get("result", "").strip()

        if result not in self.options[index]:
            print(f"[WARN] Invalid or undecided result '{result}'")
            return f"⚠️ Invalid or undecided result: '{result}'"

        self.results[index] = result
        self.resolved[index] = True

        print(f"[SUCCESS] ✅ Market '{market_id}' resolved as '{result}'")
        return {
            "market_id": market_id,
            "result": result,
            "confidence": parsed.get("confidence", "N/A"),
            "explanation": parsed.get("explanation", "N/A"),
        }

    # -------------------------------------------------
    # 📊 Market Getters
    # -------------------------------------------------
    @gl.public.view
    def get_market(self, market_id: str):
        for i, mid in enumerate(self.market_ids):
            if mid == market_id:
                return {
                    "market_id": market_id,
                    "question": self.questions[i],
                    "options": self.options[i],
                    "category": self.categories[i],
                    "deadline": self.deadlines[i],
                    "price": self.prices[i],
                    "creator": self.creators[i],
                    "resolution_url": self.resolution_urls[i],
                    "has_resolved": self.resolved[i],
                    "result": self.results[i],
                    "total_pool": self.total_bets[i],
                    "image_url": self.images[i],
                }
        return {"error": f"❌ Market '{market_id}' not found."}

    # -------------------------------------------------
    # 📦 Batch Getters
    # -------------------------------------------------
    @gl.public.view
    def get_all_markets(self):
        return [{
            "market_id": self.market_ids[i],
            "question": self.questions[i],
            "options": self.options[i],
            "category": self.categories[i],
            "deadline": self.deadlines[i],
            "price": self.prices[i],
            "creator": self.creators[i],
            "resolution_url": self.resolution_urls[i],
            "has_resolved": self.resolved[i],
            "result": self.results[i],
            "total_pool": self.total_bets[i],
            "image_url": self.images[i],
        } for i in range(len(self.market_ids))]

    @gl.public.view
    def get_all_bets(self):
        return [{
            "market_id": self.bet_market_ids[i],
            "bettor": self.bettors[i],
            "option": self.bet_options[i],
            "amount": self.bet_amounts[i],
        } for i in range(len(self.bettors))]

    # -------------------------------------------------
    # 👤 User Utilities
    # -------------------------------------------------
    @gl.public.view
    def get_user_bets(self, bettor: str):
        return [{
            "market_id": self.bet_market_ids[i],
            "option": self.bet_options[i],
            "amount": self.bet_amounts[i],
        } for i in range(len(self.bettors)) if self.bettors[i].lower() == bettor.lower()]

    @gl.public.view
    def get_user_markets(self, creator: str):
        return [{
            "market_id": self.market_ids[i],
            "question": self.questions[i],
            "options": self.options[i],
            "category": self.categories[i],
            "deadline": self.deadlines[i],
            "price": self.prices[i],
            "creator": self.creators[i],
            "has_resolved": self.resolved[i],
            "result": self.results[i],
            "total_pool": self.total_bets[i],
            "image_url": self.images[i],
        } for i in range(len(self.market_ids)) if self.creators[i].lower() == creator.lower()]

    @gl.public.view
    def has_user_bet(self, market_id: str, bettor: str):
        for i in range(len(self.bettors)):
            if self.bet_market_ids[i] == market_id and self.bettors[i].lower() == bettor.lower():
                return {"has_bet": True, "option": self.bet_options[i], "amount": self.bet_amounts[i]}
        return {"has_bet": False}

    # -------------------------------------------------
    # 📈 Stats and Filtering
    # -------------------------------------------------
    @gl.public.view
    def get_market_stats(self, market_id: str):
        unique_bettors = []
        total_yes = u256(0)
        total_no = u256(0)
        for i, mid in enumerate(self.bet_market_ids):
            if mid == market_id:
                if self.bettors[i] not in unique_bettors:
                    unique_bettors.append(self.bettors[i])
                opt = self.bet_options[i].lower()
                if opt == "yes":
                    total_yes += self.bet_amounts[i]
                elif opt == "no":
                    total_no += self.bet_amounts[i]
        total_pool = total_yes + total_no
        yes_pct = int((total_yes * 100) / total_pool) if total_pool > 0 else 50
        no_pct = int((total_no * 100) / total_pool) if total_pool > 0 else 50
        return {
            "market_id": market_id,
            "participants": len(unique_bettors),
            "total_yes": total_yes,
            "total_no": total_no,
            "yes_percentage": yes_pct,
            "no_percentage": no_pct,
            "total_pool": total_pool,
        }

    @gl.public.view
    def get_markets_by_category(self, category: str):
        return [{
            "market_id": self.market_ids[i],
            "question": self.questions[i],
            "options": self.options[i],
            "category": self.categories[i],
            "deadline": self.deadlines[i],
            "price": self.prices[i],
            "creator": self.creators[i],
            "has_resolved": self.resolved[i],
            "result": self.results[i],
            "image_url": self.images[i],
        } for i in range(len(self.market_ids)) if self.categories[i].lower() == category.lower()]

    @gl.public.view
    def get_markets_paginated(self, offset: u32, limit: u32):
        total = len(self.market_ids)
        start = max(0, offset)
        end = min(total, offset + limit)
        return {
            "markets": [{
                "market_id": self.market_ids[i],
                "question": self.questions[i],
                "options": self.options[i],
                "category": self.categories[i],
                "deadline": self.deadlines[i],
                "price": self.prices[i],
                "creator": self.creators[i],
                "has_resolved": self.resolved[i],
                "result": self.results[i],
                "image_url": self.images[i],
            } for i in range(start, end)],
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": end < total,
        }
