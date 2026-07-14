create database if not exists registeredassets;
use registeredassets;
use employee;
create table totalAssets(
	assetId int auto_increment primary key,
    name varchar(20) not null,
    status varchar(20) not null default ('Working'),
    serialNo varchar(15) unique not null,
    purchase_date date (DATE_FORMAT(a.purchase_date, '%Y-%m-%d')) not null,
    asset_type varchar(10) not null,
    Remarks varchar(500) default('NEW') not null,
    assigned_to varchar(40) default ('Yamato Logistics')
);

insert into totalAssets values ('002','Lenovo Thinkpad','Working','PAD2022A21','2026-07-01','Laptop','hello','deepak soni');
insert into totalAssets(name,status,serialno,purchase_date,asset_type,assigned_to) values ('Dell Monitor','Active','MON2022A21','2026-06-06','Monitor','krishna soni');

drop table totalassets;
create table yamatoEmployeee(
	empId int auto_increment primary key,
    name varchar(50) ,
    email varchar(25) unique default('@yamato-india.co.in'),
    mob_number bigint unique,
    department varchar(10),
    post varchar(10)
);

insert into yamatoEmployeee values ('1','Deepak Soni','deepak@yamato-india.co.in',9922098431,'IT','Manager');
insert into yamatoEmployeee values (2,'krishna soni','krisss.hhhnnnaa@gmail.com',9636516379,'IT','Intern');


drop table yamatoemployee;
insert into totalassets values ('YL001','Lenovo Thinkpad','Thinkpad','PAD2022A21','2026-07-01','Laptop','hello','Deepak');
insert into totalassets(asset_id,name,category,serialno,asset_type) values ('YL002','Dell Monitor','Monitor','MON2022A21','Monitor');
show tables;
select * from yamatoemployee;

drop database registeredassets;

select
a.assetId,
a.name as asset_name,
a.asset_type,
a.status,
DATE_FORMAT(a.purchase_date, '%Y-%m-%d') as purchase_date,
e.name as employee_name,
e.email,
e.mob_number as phone_number,
a.remarks
from totalassets a 
left join employee.yamatoemployee e on a.assigned_to = e.name;