from PIL import Image
import numpy as np

img_path = r'assets\logo_alt.png'
out_path = r'assets\logo_profile.png'

# Open image and convert to RGBA
img = Image.open(img_path).convert('RGBA')
data = np.array(img)

r, g, b, a = data.T

# Find pixels that are white or very close to white
white_areas = (r > 230) & (g > 230) & (b > 230)

# Replace with Tailwind's gray-100: #F3F4F6 -> (243, 244, 246)
data[..., 0][white_areas.T] = 243
data[..., 1][white_areas.T] = 244
data[..., 2][white_areas.T] = 246

# For transparent pixels (if any), also make them gray-100 and solid
transparent_areas = (a < 10)
data[..., 0][transparent_areas.T] = 243
data[..., 1][transparent_areas.T] = 244
data[..., 2][transparent_areas.T] = 246
data[..., 3][transparent_areas.T] = 255

img2 = Image.fromarray(data)
img2.save(out_path)
print("Saved logo_profile.png")
