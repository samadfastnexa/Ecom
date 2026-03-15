import random
import time

def initiate_payment(payment_method, amount, mobile_number, order_id):
    """
    Simulates payment initiation for JazzCash and EasyPaisa.
    In a real application, this would make an API call to the respective gateway.
    """
    
    print(f"Initiating {payment_method} payment for Order #{order_id}")
    print(f"Amount: {amount}, Mobile: {mobile_number}")
    
    # Simulate API delay
    time.sleep(1)
    
    # Simulate success/failure logic
    # For demo purposes, we'll assume success if the number is valid
    if not mobile_number or len(mobile_number) < 10:
        return {
            'success': False,
            'message': 'Invalid mobile number'
        }
        
    transaction_id = f"TRX-{random.randint(100000, 999999)}"
    
    return {
        'success': True,
        'transaction_id': transaction_id,
        'message': f'Payment request sent to {mobile_number}. Please approve on your phone.'
    }
