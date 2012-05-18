import sys
from mercurial import ui, hg
import json

#return added and modified files
def getStatus():
    return {
        'A' : repo[None].added(),
        'M' : repo[None].modified()
    }

#start,end should be hashed string like d17f7cfc88fb
def filterFiles(start, end):
    try:
        start = repo.changectx(start).__int__()
        end = repo.changectx(end).__int__()
    except Exception,e:
        return 'Error: '+str(e)
    if end < start:
        tmp = end
        end = start
        start = tmp
    files = list()
    for i in xrange(start,end+1,):
        files = list(set(files+repo.changectx(i).files()))
    return files

def getLogFiles(version):
    files = list()
    version = str(version)
    for i in xrange(len(repo)+1):       #len(repo) is the number of the repo's changectx
        ctx = repo.changectx(i) 
        if( ctx.branch().find(version) > -1 ):       #use branch information to match version
            files = list(set(files+ctx.files()))
    return files

args = sys.argv
if args[1] == '--help' or args[1] == '-h' or args[1] == 'help' :
    print 'This script is used for Guokr frontend build tool.'
    print 'python filter.py path [--filter start end] [--log version] [--status]'
    print 'arguments: '
    print '    -f|--filter    take two hashed string as uid to get hg changset files'
    print '    -l|--log      take a version number to get files changed in that version'
    print '    -s|--status   get current changed files in hg status'
    print 'For example: '
    print '    python filter.py /home/carl/local/test --filter d17f7cfc88fb 79ef4416269b'
    print '    python filter.py /home/carl/local/test --log 2.7'
    exit()

try:
    repo = hg.repository(ui.ui(), args[1])
except Exception,e:
    print json.write('Error: '+str(e))
    exit()

if args[2] == '--filter' or args[2] == '-f' or args[2] == 'filter':
    print json.write(filterFiles(args[3],args[4]))
elif args[2] == '--log' or args[2] == '-l' or args[2] == 'log':
    print json.write(getLogFiles(args[3]))
elif args[2] == '--status' or args[2] == '-s' or args[2] == 'status':
    print json.write(getStatus())
else:
    print json.write('Error: Invalid arguments.')
