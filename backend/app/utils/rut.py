import re

def validate_rut(rut: str) -> bool:
    """
    Validates a Chilean RUT (Rol Único Tributario).
    Format expected: 12.345.678-9 or 12345678-9 or 123456789
    """
    # Clean formatting
    rut = rut.replace(".", "").replace("-", "").upper()
    if not re.match(r"^\d{7,8}[0-9K]$" , rut):
        return False
    
    body = rut[:-1]
    dv = rut[-1]
    
    # Calculate expected DV
    reversed_digits = map(int, reversed(body))
    factors = [2, 3, 4, 5, 6, 7]
    s = sum(d * factors[i % 6] for i, d in enumerate(reversed_digits))
    res = 11 - (s % 11)
    
    if res == 11:
        expected_dv = "0"
    elif res == 10:
        expected_dv = "K"
    else:
        expected_dv = str(res)
        
    return dv == expected_dv

def format_rut(rut: str) -> str:
    """Standardizes RUT to XXXXXXXX-X format."""
    rut = rut.replace(".", "").replace("-", "").upper()
    if len(rut) < 2: return rut
    return f"{rut[:-1]}-{rut[-1]}"
