# ordo
A lightweight feedback  extension for Jupyter. Ordo allows users to add feedback messages in a cell's metadata. The feedback is appended to cell's output as a success or failure message based on the result the cell produces. 

### Installation
Install and enable ordo on your Jupyter server

```
pip install ordo
jupyter nbextension install --py ordo
jupyter nbextension enable ordo --py
```

### Examples
See [README.ipynb](README.ipynb) for examples. 
