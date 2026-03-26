#!/usr/bin/env python3
"""
Convert IIT Madras logo to Chrome extension icon sizes
Requires: pip install Pillow
"""

from PIL import Image
import os

def convert_image_to_icons(input_path, output_dir="images"):
    """Convert image to Chrome extension icon sizes"""
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Required icon sizes for Chrome extensions
    sizes = [16, 48, 128]
    
    try:
        # Open the original image
        with Image.open(input_path) as img:
            print(f"Original image size: {img.size}")
            
            # Convert to RGBA if not already (for transparency support)
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # Create icons for each required size
            for size in sizes:
                # Resize image with high-quality resampling
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save as PNG
                output_path = os.path.join(output_dir, f"icon{size}.png")
                resized.save(output_path, "PNG")
                print(f"✅ Created {output_path}")
            
            print("\n🎉 All icons created successfully!")
            print("Your Chrome extension is ready to install!")
            
    except Exception as e:
        print(f"❌ Error processing image: {e}")
        print("Make sure you have Pillow installed: pip install Pillow")

if __name__ == "__main__":
    # Look for the uploaded image
    image_files = [f for f in os.listdir('.') if f.lower().endswith(('.png', '.jpg', '.jpeg', '.svg'))]
    
    if image_files:
        input_image = image_files[0]  # Use the first image found
        print(f"Converting {input_image}...")
        convert_image_to_icons(input_image)
    else:
        print("❌ No image file found in current directory")
        print("Please save your IIT Madras logo image in this folder first") 