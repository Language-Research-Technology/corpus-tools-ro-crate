# corpus-tools-ro-crate


#inputs
One ro-crate directory that contains: 
- ro-crate-metadata.json
- any other files

flags:
- for making bundled or distributed
distributred means each RepositoryObject and RepositoryCollection will be put into each own OCFL storage object
examples
-arcp://name,<namespace>
  -__object__
  -collection1
    -__object__
    -object1
    -object2
  -

Delete file .siegfried.json to rerun Siegfried.