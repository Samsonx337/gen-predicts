# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

import base64
from genlayer import *


class PlainErc20(gl.Contract):
    """
    ⚡ Plain ERC20 Token for GenLayer (No LLM)
    -----------------------------------------
    ✅ Anyone can mint tokens (open mint)
    ✅ Standard ERC20-style functions
    ✅ Safe address conversion (hex/base64)
    ✅ Includes deployer management
    """

    balances: TreeMap[Address, u256]
    deployer: Address  # Contract deployer (owner)

    # -------------------------------------------------
    # 🔒 Safe Address Conversion
    # -------------------------------------------------
    def _safe_address(self, addr: str) -> Address:
        if isinstance(addr, Address):
            return addr
        addr = addr.strip().replace('"', '').replace("'", "")

        # Hex format
        if addr.startswith("0x"):
            try:
                raw_bytes = bytes.fromhex(addr[2:])
                return Address(base64.b64encode(raw_bytes).decode())
            except Exception as e:
                raise ValueError(f"Invalid hex address: {addr} ({e})")

        # Base64 format
        try:
            missing_padding = len(addr) % 4
            if missing_padding:
                addr += "=" * (4 - missing_padding)
            base64.b64decode(addr)
            return Address(addr)
        except Exception:
            raise ValueError(f"Invalid address format: {addr}")

    # -------------------------------------------------
    # 🚀 Init
    # -------------------------------------------------
    def __init__(self, total_supply: u256):
        deployer = gl.message.sender_address
        self.deployer = deployer
        self.balances[deployer] = total_supply
        print(f"[INIT] Total supply {total_supply} minted to {deployer.as_hex}")

    # -------------------------------------------------
    # 💸 Transfer
    # -------------------------------------------------
    @gl.public.write
    def transfer(self, to_address: str, amount: u256):
        sender = gl.message.sender_address
        recipient = self._safe_address(to_address)

        sender_balance = self.balances.get(sender, 0)
        if sender_balance < amount:
            return "❌ Transfer failed: insufficient balance."

        # Perform transfer
        self.balances[sender] = sender_balance - amount
        recipient_balance = self.balances.get(recipient, 0)
        self.balances[recipient] = recipient_balance + amount

        print(f"[TRANSFER] {amount} tokens sent from {sender.as_hex} → {recipient.as_hex}")
        return f"✅ Transfer successful: {amount} tokens sent."

    # -------------------------------------------------
    # 🪙 Mint (Anyone Can Mint)
    # -------------------------------------------------
    @gl.public.write
    def mint(self, to_address: str, amount: u256):
        """
        Anyone can mint new tokens.
        """
        if amount <= 0:
            return "❌ Mint amount must be positive."

        to = self._safe_address(to_address)
        current_balance = self.balances.get(to, 0)
        self.balances[to] = current_balance + amount

        print(f"[MINT] {amount} tokens minted to {to.as_hex}")
        return f"✅ Minted {amount} tokens to {to.as_hex}"

    # -------------------------------------------------
    # 🔥 Burn
    # -------------------------------------------------
    @gl.public.write
    def burn(self, amount: u256):
        sender = gl.message.sender_address
        sender_balance = self.balances.get(sender, 0)

        if sender_balance < amount:
            return "❌ Burn failed: insufficient balance."

        self.balances[sender] = sender_balance - amount
        print(f"[BURN] {sender.as_hex} burned {amount} tokens")
        return f"🔥 Burned {amount} tokens successfully."

    # -------------------------------------------------
    # 👑 Ownership Management
    # -------------------------------------------------
    @gl.public.write
    def set_deployer(self, new_owner: str):
        """
        Transfer ownership to a new deployer (admin).
        Only the current deployer can call this.
        """
        caller = gl.message.sender_address
        if caller != self.deployer:
            return "🚫 Only the current deployer can change ownership."

        new_owner_addr = self._safe_address(new_owner)
        self.deployer = new_owner_addr

        print(f"[OWNERSHIP] Deployer changed to {new_owner_addr.as_hex}")
        return f"✅ Ownership transferred to {new_owner_addr.as_hex}"

    # -------------------------------------------------
    # 📊 View Functions
    # -------------------------------------------------
    @gl.public.view
    def get_balances(self):
        """Return all balances."""
        return {k.as_hex: v for k, v in self.balances.items()}

    @gl.public.view
    def get_balance_of(self, address: str):
        """Get the balance of a specific address."""
        addr = self._safe_address(address)
        return self.balances.get(addr, 0)

    @gl.public.view
    def total_supply(self):
        """Return total token supply."""
        return sum(self.balances.values())

    @gl.public.view
    def get_deployer(self):
        """Return deployer address."""
        return self.deployer.as_hex
