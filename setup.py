from distutils.core import setup

setup (
	name = 'ordo',
	packages = ['ordo'],
	version = '0.3.0',
	description = 'A lightweight feedback tool for Jupyter',
	author = 'Andre J. Michell',
	author_email = 'andre.j.michell2@gmail.com',
	url = 'https://github.com/nbgallery/ordo',
	keywords = ['nbgallery', 'Jupyter', 'grading'],
	package_data = {'ordo': ['ordo.js'],},
)
