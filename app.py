import pickle
from flask import Flask, request, jsonify
import pandas as pd
from flask_cors import CORS

# Initialize the Flask app
app = Flask(__name__)
CORS(app)
# Load the trained model
with open('my_model (1).pkl', 'rb') as f:
    model = pickle.load(f)

# Load the one-hot encoder
with open('encoder (1).pkl', 'rb') as f:
    encoder = pickle.load(f)

# Define the route for predictions
@app.route('/predict', methods=['POST'])
def predict():
    # Get the data from the POST request
    data = request.json
    # Convert the data into a DataFrame
    df = pd.DataFrame(data, index=[0])
    
    # One-hot encode the 'Route' column
    routes_encoded = encoder.transform(df[['Route']])
    routes_encoded_df = pd.DataFrame(routes_encoded, columns=encoder.get_feature_names_out(['Route']))
    
    # Combine the encoded routes with the original data
    df_encoded = pd.concat([df.drop('Route', axis=1), routes_encoded_df], axis=1)
    
    # Predict using the trained model
    prediction = model.predict(df_encoded)
    
    # Return the prediction as a JSON response
    return jsonify({'travelTime': prediction[0]})

# Run the app
if __name__ == '__main__':
    app.run(debug=True)
