create database if not exists assets;
use assets;

create table currentAssets(
	assetId int auto_increment primary key,
    name varchar(20) not null,
    status varchar(20) not null default ('Active'),
    serialNo varchar(15) unique not null,
    purchase_date date not null,
    asset_type varchar(10) not null,
    Remarks varchar(500) default('NEW') not null
);

drop table currentAssets;

insert into currentAssets values ('002','Lenovo Thinkpad','Active','PAD2022A21','2026-07-01','Laptop','New'),
('003','Asus Vivobook','Active','VIV2022A21','2026-06-12','Laptop','Good condition'),
('004','Lenovo Yoga','Inactive','YOG2022A21','2026-05-01','Charger','Motherboard problem'),
('005','Tplink S304','Active','S340','2025-12-10','Switch','Working hai'),
('006','Portronics M42','Active','PAD2032A21','2025-07-11','Mouse','Mouse'),
('007','Apple TV','Active','PAD2122A21','2026-02-21','Monitor','APPLE TV');
insert into currentAssets(name,status,serialno,purchase_date,asset_type) values ('Dell Monitor','Active','MON2022A21','2024-05-04','Monitor');

select * from currentAssets;


