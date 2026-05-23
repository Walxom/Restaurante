import json
from pathlib import Path
from typing import Optional
import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

CACHE_DIR = Path(__file__).parent.parent / "cache"
RULES_FILE = CACHE_DIR / "market_basket_rules.json"


class MarketBasketAnalyzer:
    def __init__(self):
        self.rules: list[dict] = []
        self._loaded = False

    def ensure_trained(self):
        if self._loaded:
            return
        if RULES_FILE.exists():
            with open(RULES_FILE, "r") as f:
                self.rules = json.load(f)
            self._loaded = True
            print(f"[Basket] Cargadas {len(self.rules)} reglas desde cache.")

    def has_rules(self) -> bool:
        return len(self.rules) > 0

    def train(self, transactions: list[dict]):
        if not transactions:
            print("[Basket] Sin datos de transacciones. Saltando.")
            return

        df = pd.DataFrame(transactions)
        baskets = df.groupby("order_id")["productId"].apply(list).reset_index()
        basket_list = baskets["productId"].tolist()

        if len(basket_list) < 10:
            print(f"[Basket] Pocas transacciones ({len(basket_list)}). Se necesitan al menos 10.")
            RULES_FILE.unlink(missing_ok=True)
            self.rules = []
            self._loaded = True
            return

        te = TransactionEncoder()
        te_ary = te.fit(basket_list).transform(basket_list)
        df_basket = pd.DataFrame(te_ary, columns=te.columns_)

        min_support = max(0.003, 3.0 / len(basket_list))
        frequent = apriori(df_basket, min_support=min_support, use_colnames=True)

        if len(frequent) < 2:
            print("[Basket] Pocos items frecuentes. Reglas no generadas.")
            self.rules = []
            self._loaded = True
            return

        rules_df = association_rules(frequent, metric="confidence", min_threshold=0.1)

        if len(rules_df) == 0:
            print("[Basket] Ninguna regla cumple el umbral.")
            self.rules = []
            self._loaded = True
            return

        self.rules = []
        for _, row in rules_df.iterrows():
            self.rules.append({
                "antecedents": sorted(list(row["antecedents"])),
                "consequents": sorted(list(row["consequents"])),
                "support": round(row["support"], 4),
                "confidence": round(row["confidence"], 4),
                "lift": round(row["lift"], 4),
                "leverage": round(row["leverage"], 4),
                "conviction": round(row["conviction"], 4) if not pd.isna(row["conviction"]) else 0
            })

        self.rules.sort(key=lambda r: r["lift"], reverse=True)

        with open(RULES_FILE, "w") as f:
            json.dump(self.rules, f, indent=2)

        self._loaded = True
        print(f"[Basket] Generadas {len(self.rules)} reglas de asociacion.")

    def get_suggestions(self, product_id: str, product_map: dict) -> list[dict]:
        suggestions = []
        seen = set()
        for rule in self.rules:
            if product_id in rule["antecedents"]:
                for conseq in rule["consequents"]:
                    if conseq != product_id and conseq not in seen:
                        seen.add(conseq)
                        suggestions.append({
                            "product_id": conseq,
                            "product_name": product_map.get(conseq, "Desconocido"),
                            "confidence": rule["confidence"],
                            "lift": rule["lift"]
                        })
        suggestions.sort(key=lambda s: s["lift"], reverse=True)
        return suggestions[:5]

    def get_top_rules(self, n: int = 10) -> list[dict]:
        return self.rules[:n]
