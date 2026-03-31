import requests

def get_coordinates_from_place(place_name):
    print(f"Testing {place_name}...")
    try:
        url = f"https://nominatim.openstreetmap.org/search?q={place_name}&format=json&limit=1"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36"}
        res = requests.get(url, headers=headers, timeout=5)
        res.raise_for_status()
        data = res.json()

        if data and len(data) > 0:
            lat = float(data[0]["lat"])
            lon = float(data[0]["lon"])
            print(f"Nominatim OK: {lat}, {lon}")
            return lat, lon
        else:
            print("Nominatim returned empty data.")
    except Exception as e:
        print("Nominatim Geocoding Error:", type(e).__name__, e)

    try:
        url = f"https://geocoding-api.open-meteo.com/v1/search?name={place_name}&count=1"
        res = requests.get(url, timeout=5)
        res.raise_for_status()
        data = res.json()
        
        if "results" in data and len(data["results"]) > 0:
            lat = float(data["results"][0]["latitude"])
            lon = float(data["results"][0]["longitude"])
            print(f"Open-Meteo OK: {lat}, {lon}")
            return lat, lon
        else:
            print("Open-Meteo returned empty data.")
    except Exception as e:
        print("Open-Meteo Geocoding Error:", type(e).__name__, e)

    print("Failed both.")
    return None, None

get_coordinates_from_place("Vizag")
get_coordinates_from_place("Hyderabad")
